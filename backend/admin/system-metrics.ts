import { api } from "encore.dev/api";
import { db } from "./db";
import { createLogger } from "../shared/logger";
import { ServiceError, handleServiceError } from "../shared/errors";
import { requireAuth, type AuthParams } from "../shared/auth";

const logger = createLogger("admin");

export interface SystemMetrics {
  users: {
    total: number;
    activeLastDay: number;
    activeLastWeek: number;
    activeLastMonth: number;
  };
  events: {
    total: number;
    lastDay: number;
    lastWeek: number;
    lastMonth: number;
    topEventTypes: Array<{ name: string; count: number }>;
  };
  traits: {
    definitionCount: number;
    computedCount: number;
    topTraits: Array<{ key: string; userCount: number }>;
  };
  segments: {
    definitionCount: number;
    computedCount: number;
    topSegments: Array<{ key: string; userCount: number }>;
  };
  flags: {
    definitionCount: number;
  };
  database: {
    size?: string;
    tables: Array<{ name: string; rowCount: number }>;
  };
}

export interface GetSystemMetricsResponse {
  metrics: SystemMetrics;
  timestamp: Date;
}

// Retrieves comprehensive system metrics for monitoring and debugging.
export const getSystemMetrics = api<AuthParams, GetSystemMetricsResponse>(
  { expose: true, method: "GET", path: "/v1/admin/metrics" },
  async (params) => {
    try {
      await requireAuth('read', params.authorization);

      logger.info("Getting system metrics");

      const now = new Date();
      const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // User metrics
      const [totalUsers, activeUsersDay, activeUsersWeek, activeUsersMonth] = await Promise.all([
        db.queryRow<{ count: string }>`SELECT COUNT(*) as count FROM users`,
        db.queryRow<{ count: string }>`
          SELECT COUNT(DISTINCT user_id) as count 
          FROM events 
          WHERE ts >= ${lastDay}
        `,
        db.queryRow<{ count: string }>`
          SELECT COUNT(DISTINCT user_id) as count 
          FROM events 
          WHERE ts >= ${lastWeek}
        `,
        db.queryRow<{ count: string }>`
          SELECT COUNT(DISTINCT user_id) as count 
          FROM events 
          WHERE ts >= ${lastMonth}
        `
      ]);

      // Event metrics
      const [totalEvents, eventsDay, eventsWeek, eventsMonth] = await Promise.all([
        db.queryRow<{ count: string }>`SELECT COUNT(*) as count FROM events`,
        db.queryRow<{ count: string }>`
          SELECT COUNT(*) as count 
          FROM events 
          WHERE ts >= ${lastDay}
        `,
        db.queryRow<{ count: string }>`
          SELECT COUNT(*) as count 
          FROM events 
          WHERE ts >= ${lastWeek}
        `,
        db.queryRow<{ count: string }>`
          SELECT COUNT(*) as count 
          FROM events 
          WHERE ts >= ${lastMonth}
        `
      ]);

      // Top event types (last 30 days)
      const topEventTypes = await db.queryAll<{ name: string; count: string }>`
        SELECT name, COUNT(*) as count
        FROM events
        WHERE ts >= ${lastMonth}
        GROUP BY name
        ORDER BY count DESC
        LIMIT 10
      `;

      // Trait metrics
      const [traitDefs, computedTraits] = await Promise.all([
        db.queryRow<{ count: string }>`SELECT COUNT(*) as count FROM trait_defs`,
        db.queryRow<{ count: string }>`SELECT COUNT(*) as count FROM user_traits`
      ]);

      // Top traits by user count
      const topTraits = await db.queryAll<{ key: string; count: string }>`
        SELECT key, COUNT(DISTINCT user_id) as count
        FROM user_traits
        GROUP BY key
        ORDER BY count DESC
        LIMIT 10
      `;

      // Segment metrics
      const [segmentDefs, computedSegments] = await Promise.all([
        db.queryRow<{ count: string }>`SELECT COUNT(*) as count FROM segment_defs`,
        db.queryRow<{ count: string }>`SELECT COUNT(*) as count FROM user_segments`
      ]);

      // Top segments by user count (only active memberships)
      const topSegments = await db.queryAll<{ key: string; count: string }>`
        SELECT key, COUNT(DISTINCT user_id) as count
        FROM user_segments
        WHERE in_segment = true
        GROUP BY key
        ORDER BY count DESC
        LIMIT 10
      `;

      // Flag metrics
      const flagDefs = await db.queryRow<{ count: string }>`SELECT COUNT(*) as count FROM flags`;

      // Database table sizes
      const tables = await db.queryAll<{ name: string; count: string }>`
        SELECT 'users' as name, COUNT(*) as count FROM users
        UNION ALL
        SELECT 'events' as name, COUNT(*) as count FROM events
        UNION ALL
        SELECT 'user_traits' as name, COUNT(*) as count FROM user_traits
        UNION ALL
        SELECT 'user_segments' as name, COUNT(*) as count FROM user_segments
        UNION ALL
        SELECT 'trait_defs' as name, COUNT(*) as count FROM trait_defs
        UNION ALL
        SELECT 'segment_defs' as name, COUNT(*) as count FROM segment_defs
        UNION ALL
        SELECT 'flags' as name, COUNT(*) as count FROM flags
        UNION ALL
        SELECT 'api_keys' as name, COUNT(*) as count FROM api_keys
        UNION ALL
        SELECT 'user_aliases' as name, COUNT(*) as count FROM user_aliases
        ORDER BY name
      `;

      const metrics: SystemMetrics = {
        users: {
          total: parseInt(totalUsers?.count || '0', 10),
          activeLastDay: parseInt(activeUsersDay?.count || '0', 10),
          activeLastWeek: parseInt(activeUsersWeek?.count || '0', 10),
          activeLastMonth: parseInt(activeUsersMonth?.count || '0', 10)
        },
        events: {
          total: parseInt(totalEvents?.count || '0', 10),
          lastDay: parseInt(eventsDay?.count || '0', 10),
          lastWeek: parseInt(eventsWeek?.count || '0', 10),
          lastMonth: parseInt(eventsMonth?.count || '0', 10),
          topEventTypes: topEventTypes.map(e => ({
            name: e.name,
            count: parseInt(e.count, 10)
          }))
        },
        traits: {
          definitionCount: parseInt(traitDefs?.count || '0', 10),
          computedCount: parseInt(computedTraits?.count || '0', 10),
          topTraits: topTraits.map(t => ({
            key: t.key,
            userCount: parseInt(t.count, 10)
          }))
        },
        segments: {
          definitionCount: parseInt(segmentDefs?.count || '0', 10),
          computedCount: parseInt(computedSegments?.count || '0', 10),
          topSegments: topSegments.map(s => ({
            key: s.key,
            userCount: parseInt(s.count, 10)
          }))
        },
        flags: {
          definitionCount: parseInt(flagDefs?.count || '0', 10)
        },
        database: {
          tables: tables.map(t => ({
            name: t.name,
            rowCount: parseInt(t.count, 10)
          }))
        }
      };

      logger.info("Retrieved system metrics", {
        totalUsers: metrics.users.total,
        totalEvents: metrics.events.total,
        traitDefinitions: metrics.traits.definitionCount,
        segmentDefinitions: metrics.segments.definitionCount
      });

      return {
        metrics,
        timestamp: now
      };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "getSystemMetrics"
      });
    }
  }
);
