import { api } from "encore.dev/api";
import { db } from "./db";
import { createLogger } from "../shared/logger";
import { ServiceError, handleServiceError } from "../shared/errors";
import { requireAuth, type AuthParams } from "../shared/auth";
import { Query } from "encore.dev/api";

const logger = createLogger("admin");

export interface SearchUsersParams extends AuthParams {
  query?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
}

export interface UserSearchResult {
  id: string;
  created_at: Date;
  aliases: Array<{ kind: string; value: string }>;
  lastEventTime?: Date;
  eventCount: number;
  activeSegments: string[];
}

export interface SearchUsersResponse {
  users: UserSearchResult[];
  total: number;
  hasMore: boolean;
}

// Searches users by alias values or other criteria.
export const searchUsers = api<SearchUsersParams, SearchUsersResponse>(
  { expose: true, method: "GET", path: "/v1/admin/users/search" },
  async (params) => {
    try {
      await requireAuth('read', params);

      const query = params.query || '';
      const limit = Math.min(params.limit || 50, 100); // Max 100 results
      const offset = params.offset || 0;

      logger.info("Searching users", { query, limit, offset });

      let whereClause = '';
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Build search query
      if (query.trim()) {
        whereClause = `
          WHERE EXISTS (
            SELECT 1 FROM user_aliases ua 
            WHERE ua.user_id = u.id 
            AND (ua.value ILIKE $${paramIndex} OR u.id::text ILIKE $${paramIndex})
          )
        `;
        queryParams.push(`%${query}%`);
        paramIndex++;
      }

      // Get total count
      const totalResult = await db.rawQueryRow<{ count: string }>(
        `SELECT COUNT(*) as count FROM users u ${whereClause}`,
        ...queryParams
      );

      const total = parseInt(totalResult?.count || '0', 10);

      // Get users with pagination
      const usersRaw = await db.rawQueryAll<{
        id: string;
        created_at: Date;
        aliases: string;
        last_event_time: Date | null;
        event_count: string;
        active_segments: string;
      }>(
        `
        SELECT 
          u.id,
          u.created_at,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object('kind', ua.kind, 'value', ua.value)
              )
              FROM user_aliases ua 
              WHERE ua.user_id = u.id
            ),
            '[]'::json
          ) as aliases,
          (
            SELECT MAX(e.ts) 
            FROM events e 
            WHERE e.user_id = u.id
          ) as last_event_time,
          COALESCE(
            (
              SELECT COUNT(*) 
              FROM events e 
              WHERE e.user_id = u.id
            ),
            0
          ) as event_count,
          COALESCE(
            (
              SELECT json_agg(us.key)
              FROM user_segments us
              WHERE us.user_id = u.id AND us.in_segment = true
            ),
            '[]'::json
          ) as active_segments
        FROM users u
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `,
        ...queryParams,
        limit,
        offset
      );

      const users: UserSearchResult[] = usersRaw.map(user => {
        // Safely parse JSON fields
        let aliases: Array<{ kind: string; value: string }> = [];
        let activeSegments: string[] = [];
        
        try {
          if (typeof user.aliases === 'string') {
            aliases = JSON.parse(user.aliases);
          } else if (Array.isArray(user.aliases)) {
            aliases = user.aliases;
          }
        } catch (error) {
          logger.warn("Failed to parse user aliases", { userId: user.id, aliases: user.aliases, error });
          aliases = [];
        }
        
        try {
          if (typeof user.active_segments === 'string') {
            activeSegments = JSON.parse(user.active_segments);
          } else if (Array.isArray(user.active_segments)) {
            activeSegments = user.active_segments;
          }
        } catch (error) {
          logger.warn("Failed to parse user active segments", { userId: user.id, activeSegments: user.active_segments, error });
          activeSegments = [];
        }
        
        return {
          id: user.id,
          created_at: user.created_at,
          aliases,
          lastEventTime: user.last_event_time || undefined,
          eventCount: parseInt(user.event_count, 10),
          activeSegments
        };
      });

      const hasMore = offset + limit < total;

      logger.info("User search completed", {
        query,
        total,
        returned: users.length,
        hasMore
      });

      return {
        users,
        total,
        hasMore
      };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "searchUsers",
        query: params.query,
        limit: params.limit,
        offset: params.offset
      });
    }
  }
);
