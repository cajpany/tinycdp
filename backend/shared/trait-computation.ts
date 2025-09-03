import { db } from "./db";
import { createLogger } from "./logger";
import type { EventMetric, TraitContext } from "./traits-dsl";

const logger = createLogger("trait-computation");

export interface ComputedTrait {
  key: string;
  value: any;
  userId: string;
}

export class TraitComputer {
  constructor() {}

  private async getEventMetrics(userId: string): Promise<{ [eventName: string]: EventMetric }> {
    logger.debug("Computing event metrics for user", { userId });
    
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all event names for this user
    const eventNames = await db.queryAll<{ name: string }>`
      SELECT DISTINCT name FROM events WHERE user_id = ${userId}
    `;

    const metrics: { [eventName: string]: EventMetric } = {};

    for (const { name: eventName } of eventNames) {
      // Count events in different time windows
      const count7d = await db.queryRow<{ count: string }>`
        SELECT COUNT(*) as count FROM events 
        WHERE user_id = ${userId} AND name = ${eventName} AND ts >= ${sevenDaysAgo}
      `;

      const count14d = await db.queryRow<{ count: string }>`
        SELECT COUNT(*) as count FROM events 
        WHERE user_id = ${userId} AND name = ${eventName} AND ts >= ${fourteenDaysAgo}
      `;

      const count30d = await db.queryRow<{ count: string }>`
        SELECT COUNT(*) as count FROM events 
        WHERE user_id = ${userId} AND name = ${eventName} AND ts >= ${thirtyDaysAgo}
      `;

      // Count unique days with events in different time windows
      const uniqueDays7d = await db.queryRow<{ count: string }>`
        SELECT COUNT(DISTINCT DATE(ts)) as count FROM events 
        WHERE user_id = ${userId} AND name = ${eventName} AND ts >= ${sevenDaysAgo}
      `;

      const uniqueDays14d = await db.queryRow<{ count: string }>`
        SELECT COUNT(DISTINCT DATE(ts)) as count FROM events 
        WHERE user_id = ${userId} AND name = ${eventName} AND ts >= ${fourteenDaysAgo}
      `;

      const uniqueDays30d = await db.queryRow<{ count: string }>`
        SELECT COUNT(DISTINCT DATE(ts)) as count FROM events 
        WHERE user_id = ${userId} AND name = ${eventName} AND ts >= ${thirtyDaysAgo}
      `;

      // Get first and last event timestamps
      const firstEvent = await db.queryRow<{ ts: Date }>`
        SELECT ts FROM events 
        WHERE user_id = ${userId} AND name = ${eventName} 
        ORDER BY ts ASC LIMIT 1
      `;

      const lastEvent = await db.queryRow<{ ts: Date }>`
        SELECT ts FROM events 
        WHERE user_id = ${userId} AND name = ${eventName} 
        ORDER BY ts DESC LIMIT 1
      `;

      const firstSeenDaysAgo = firstEvent 
        ? Math.floor((now.getTime() - firstEvent.ts.getTime()) / (24 * 60 * 60 * 1000))
        : -1;

      const lastSeenDaysAgo = lastEvent
        ? Math.floor((now.getTime() - lastEvent.ts.getTime()) / (24 * 60 * 60 * 1000))
        : -1;

      metrics[eventName] = {
        count_7d: parseInt(count7d?.count || '0', 10),
        count_14d: parseInt(count14d?.count || '0', 10),
        count_30d: parseInt(count30d?.count || '0', 10),
        unique_days_7d: parseInt(uniqueDays7d?.count || '0', 10),
        unique_days_14d: parseInt(uniqueDays14d?.count || '0', 10),
        unique_days_30d: parseInt(uniqueDays30d?.count || '0', 10),
        first_seen_days_ago: firstSeenDaysAgo,
        last_seen_days_ago: lastSeenDaysAgo
      };
    }

    logger.debug("Computed event metrics", { 
      userId, 
      eventCount: eventNames.length,
      metrics: Object.keys(metrics)
    });

    return metrics;
  }

  private async getUserTimestamps(userId: string): Promise<{ firstSeenDaysAgo: number; lastSeenMinutesAgo: number }> {
    const now = new Date();

    // Get first event for this user
    const firstEvent = await db.queryRow<{ ts: Date }>`
      SELECT ts FROM events WHERE user_id = ${userId} ORDER BY ts ASC LIMIT 1
    `;

    // Get last event for this user
    const lastEvent = await db.queryRow<{ ts: Date }>`
      SELECT ts FROM events WHERE user_id = ${userId} ORDER BY ts DESC LIMIT 1
    `;

    const firstSeenDaysAgo = firstEvent
      ? Math.floor((now.getTime() - firstEvent.ts.getTime()) / (24 * 60 * 60 * 1000))
      : -1;

    const lastSeenMinutesAgo = lastEvent
      ? Math.floor((now.getTime() - lastEvent.ts.getTime()) / (60 * 1000))
      : -1;

    return { firstSeenDaysAgo, lastSeenMinutesAgo };
  }

  public async buildTraitContext(userId: string): Promise<TraitContext> {
    logger.debug("Building trait context for user", { userId });

    const [eventMetrics, userTimestamps] = await Promise.all([
      this.getEventMetrics(userId),
      this.getUserTimestamps(userId)
    ]);

    // For now, profile is empty - in the future this could come from identify calls
    const profile: Record<string, unknown> = {};

    const context: TraitContext = {
      userId,
      events: eventMetrics,
      profile,
      firstSeenDaysAgo: userTimestamps.firstSeenDaysAgo,
      lastSeenMinutesAgo: userTimestamps.lastSeenMinutesAgo
    };

    logger.debug("Built trait context", {
      userId,
      eventTypes: Object.keys(eventMetrics),
      firstSeenDaysAgo: userTimestamps.firstSeenDaysAgo,
      lastSeenMinutesAgo: userTimestamps.lastSeenMinutesAgo
    });

    return context;
  }

  public async computeTraitsForUser(userId: string): Promise<ComputedTrait[]> {
    logger.info("Computing traits for user", { userId });

    try {
      // Get all trait definitions
      const traitDefs = await db.queryAll<{ key: string; expression: string }>`
        SELECT key, expression FROM trait_defs ORDER BY key
      `;

      if (traitDefs.length === 0) {
        logger.debug("No trait definitions found");
        return [];
      }

      // Build trait context
      const context = await this.buildTraitContext(userId);

      const computedTraits: ComputedTrait[] = [];

      // Evaluate each trait
      for (const traitDef of traitDefs) {
        try {
          const { evaluateTraitExpression } = await import("./traits-dsl");
          const value = evaluateTraitExpression(traitDef.expression, context);

          computedTraits.push({
            key: traitDef.key,
            value,
            userId
          });

          logger.debug("Computed trait", {
            userId,
            traitKey: traitDef.key,
            value,
            expression: traitDef.expression
          });

        } catch (error) {
          logger.error("Failed to compute trait", error instanceof Error ? error : new Error(String(error)), {
            userId,
            traitKey: traitDef.key,
            expression: traitDef.expression
          });
          
          // Set trait to null if computation fails
          computedTraits.push({
            key: traitDef.key,
            value: null,
            userId
          });
        }
      }

      logger.info("Computed traits for user", {
        userId,
        traitCount: computedTraits.length,
        successfulTraits: computedTraits.filter(t => t.value !== null).length
      });

      return computedTraits;

    } catch (error) {
      logger.error("Failed to compute traits for user", error instanceof Error ? error : new Error(String(error)), {
        userId
      });
      throw error;
    }
  }

  public async saveComputedTraits(traits: ComputedTrait[]): Promise<void> {
    if (traits.length === 0) {
      return;
    }

    const userId = traits[0].userId;
    logger.debug("Saving computed traits", { userId, traitCount: traits.length });

    try {
      // Use a transaction to ensure consistency
      await db.begin().then(async (tx) => {
        try {
          for (const trait of traits) {
            await tx.exec`
              INSERT INTO user_traits (user_id, key, value, updated_at)
              VALUES (${trait.userId}, ${trait.key}, ${JSON.stringify(trait.value)}, NOW())
              ON CONFLICT (user_id, key) 
              DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
            `;
          }

          await tx.commit();
          
          logger.info("Successfully saved computed traits", {
            userId,
            traitCount: traits.length
          });

        } catch (error) {
          await tx.rollback();
          throw error;
        }
      });

    } catch (error) {
      logger.error("Failed to save computed traits", error instanceof Error ? error : new Error(String(error)), {
        userId,
        traitCount: traits.length
      });
      throw error;
    }
  }

  public async computeAndSaveTraitsForUser(userId: string): Promise<ComputedTrait[]> {
    const traits = await this.computeTraitsForUser(userId);
    await this.saveComputedTraits(traits);
    return traits;
  }
}

// Singleton instance
export const traitComputer = new TraitComputer();
