import { api } from "encore.dev/api";
import { db } from "./db";
import { createLogger } from "../shared/logger";
import { ServiceError, handleServiceError } from "../shared/errors";
import { requireAuth, type AuthParams } from "../shared/auth";

const logger = createLogger("admin");

export interface GetUserDetailParams extends AuthParams {
  userId: string;
}

export interface UserAlias {
  kind: string;
  value: string;
}

export interface UserEvent {
  id: number;
  ts: Date;
  name: string;
  props?: Record<string, unknown>;
}

export interface UserTrait {
  key: string;
  value: any;
  updated_at: Date;
}

export interface UserSegment {
  key: string;
  inSegment: boolean;
  since?: Date;
  updated_at: Date;
}

export interface UserDetail {
  id: string;
  created_at: Date;
  aliases: UserAlias[];
  recentEvents: UserEvent[];
  traits: UserTrait[];
  segments: UserSegment[];
  eventCounts: {
    total: number;
    last_24h: number;
    last_7d: number;
    last_30d: number;
  };
}

export interface GetUserDetailResponse {
  user: UserDetail;
}

// Retrieves comprehensive user information for debugging and analysis.
export const getUserDetail = api<GetUserDetailParams, GetUserDetailResponse>(
  { expose: true, method: "GET", path: "/v1/admin/users/:userId" },
  async (params) => {
    try {
      await requireAuth('read', params.authorization);

      logger.info("Getting user detail", { userId: params.userId });

      // Get user basic info
      const user = await db.queryRow<{ id: string; created_at: Date }>`
        SELECT id, created_at FROM users WHERE id = ${params.userId}
      `;

      if (!user) {
        throw new ServiceError("USER_NOT_FOUND", "User not found", 404);
      }

      // Get user aliases
      const aliases = await db.queryAll<UserAlias>`
        SELECT kind, value FROM user_aliases WHERE user_id = ${params.userId}
      `;

      // Get recent events (last 50)
      const recentEventsRaw = await db.queryAll<{
        id: number;
        ts: Date;
        name: string;
        props: string | null;
      }>`
        SELECT id, ts, name, props 
        FROM events 
        WHERE user_id = ${params.userId}
        ORDER BY ts DESC 
        LIMIT 50
      `;

      const recentEvents: UserEvent[] = recentEventsRaw.map(event => ({
        id: event.id,
        ts: event.ts,
        name: event.name,
        props: event.props ? JSON.parse(event.props) : undefined
      }));

      // Get computed traits
      const traitsRaw = await db.queryAll<{
        key: string;
        value: string;
        updated_at: Date;
      }>`
        SELECT key, value, updated_at 
        FROM user_traits 
        WHERE user_id = ${params.userId}
        ORDER BY key
      `;

      const traits: UserTrait[] = traitsRaw.map(trait => ({
        key: trait.key,
        value: JSON.parse(trait.value),
        updated_at: trait.updated_at
      }));

      // Get segments
      const segments = await db.queryAll<UserSegment>`
        SELECT key, in_segment as "inSegment", since, updated_at 
        FROM user_segments 
        WHERE user_id = ${params.userId}
        ORDER BY key
      `;

      // Get event counts
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [totalCount, count24h, count7d, count30d] = await Promise.all([
        db.queryRow<{ count: string }>`
          SELECT COUNT(*) as count FROM events WHERE user_id = ${params.userId}
        `,
        db.queryRow<{ count: string }>`
          SELECT COUNT(*) as count FROM events WHERE user_id = ${params.userId} AND ts >= ${last24h}
        `,
        db.queryRow<{ count: string }>`
          SELECT COUNT(*) as count FROM events WHERE user_id = ${params.userId} AND ts >= ${last7d}
        `,
        db.queryRow<{ count: string }>`
          SELECT COUNT(*) as count FROM events WHERE user_id = ${params.userId} AND ts >= ${last30d}
        `
      ]);

      const eventCounts = {
        total: parseInt(totalCount?.count || '0', 10),
        last_24h: parseInt(count24h?.count || '0', 10),
        last_7d: parseInt(count7d?.count || '0', 10),
        last_30d: parseInt(count30d?.count || '0', 10)
      };

      const userDetail: UserDetail = {
        id: user.id,
        created_at: user.created_at,
        aliases,
        recentEvents,
        traits,
        segments,
        eventCounts
      };

      logger.info("Retrieved user detail", {
        userId: params.userId,
        aliasCount: aliases.length,
        recentEventCount: recentEvents.length,
        traitCount: traits.length,
        segmentCount: segments.length,
        totalEvents: eventCounts.total
      });

      return { user: userDetail };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "getUserDetail",
        userId: params.userId
      });
    }
  }
);
