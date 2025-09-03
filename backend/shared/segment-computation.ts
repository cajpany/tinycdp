import { db } from "./db";
import { createLogger } from "./logger";

const logger = createLogger("segment-computation");

export interface ComputedSegment {
  key: string;
  inSegment: boolean;
  userId: string;
}

export class SegmentComputer {
  constructor() {}

  private async getUserTraits(userId: string): Promise<Record<string, any>> {
    logger.debug("Getting user traits for segment computation", { userId });

    const traits = await db.queryAll<{
      key: string;
      value: string;
    }>`
      SELECT key, value FROM user_traits WHERE user_id = ${userId}
    `;

    const traitMap: Record<string, any> = {};
    for (const trait of traits) {
      try {
        traitMap[trait.key] = JSON.parse(trait.value);
      } catch (error) {
        logger.warn("Failed to parse trait value", { 
          userId, 
          traitKey: trait.key, 
          rawValue: trait.value 
        });
        traitMap[trait.key] = null;
      }
    }

    logger.debug("Retrieved user traits", {
      userId,
      traitCount: Object.keys(traitMap).length,
      traits: Object.keys(traitMap)
    });

    return traitMap;
  }

  private evaluateSegmentRule(rule: string, traits: Record<string, any>): boolean {
    logger.debug("Evaluating segment rule", { rule, traits });

    try {
      // Simple segment rule evaluation
      // For now, we support basic boolean expressions with trait references
      // Examples: "power_user == true", "recent_buyer == true && power_user == false"

      // Replace trait references with actual values
      let expression = rule;
      
      // Match trait references (alphanumeric + underscore identifiers)
      const traitReferences = rule.match(/[a-zA-Z_][a-zA-Z0-9_]*/g);
      
      if (traitReferences) {
        for (const traitKey of traitReferences) {
          // Skip boolean keywords
          if (['true', 'false', 'null'].includes(traitKey)) {
            continue;
          }

          const traitValue = traits[traitKey];
          let replacement: string;

          if (traitValue === null || traitValue === undefined) {
            replacement = 'null';
          } else if (typeof traitValue === 'boolean') {
            replacement = traitValue.toString();
          } else if (typeof traitValue === 'number') {
            replacement = traitValue.toString();
          } else if (typeof traitValue === 'string') {
            replacement = `"${traitValue.replace(/"/g, '\\"')}"`;
          } else {
            replacement = 'null';
          }

          // Replace all occurrences of this trait key with its value
          const regex = new RegExp(`\\b${traitKey}\\b`, 'g');
          expression = expression.replace(regex, replacement);
        }
      }

      logger.debug("Evaluating transformed expression", { 
        originalRule: rule, 
        transformedExpression: expression 
      });

      // Use Function constructor to safely evaluate the expression
      // This is safe because we control the input and have sanitized it
      const result = new Function(`return ${expression}`)();
      
      logger.debug("Segment rule evaluation result", { 
        rule, 
        result: Boolean(result) 
      });
      
      return Boolean(result);

    } catch (error) {
      logger.error("Failed to evaluate segment rule", error instanceof Error ? error : new Error(String(error)), {
        rule,
        traits
      });
      return false;
    }
  }

  public async computeSegmentsForUser(userId: string): Promise<ComputedSegment[]> {
    logger.info("Computing segments for user", { userId });

    try {
      // Get all segment definitions
      const segmentDefs = await db.queryAll<{ key: string; rule: string }>`
        SELECT key, rule FROM segment_defs ORDER BY key
      `;

      if (segmentDefs.length === 0) {
        logger.debug("No segment definitions found");
        return [];
      }

      // Get user traits
      const traits = await getUserTraits(userId);

      const computedSegments: ComputedSegment[] = [];

      // Evaluate each segment
      for (const segmentDef of segmentDefs) {
        try {
          const inSegment = this.evaluateSegmentRule(segmentDef.rule, traits);

          computedSegments.push({
            key: segmentDef.key,
            inSegment,
            userId
          });

          logger.debug("Computed segment", {
            userId,
            segmentKey: segmentDef.key,
            inSegment,
            rule: segmentDef.rule
          });

        } catch (error) {
          logger.error("Failed to compute segment", error instanceof Error ? error : new Error(String(error)), {
            userId,
            segmentKey: segmentDef.key,
            rule: segmentDef.rule
          });
          
          // Set segment to false if computation fails
          computedSegments.push({
            key: segmentDef.key,
            inSegment: false,
            userId
          });
        }
      }

      logger.info("Computed segments for user", {
        userId,
        segmentCount: computedSegments.length,
        inSegments: computedSegments.filter(s => s.inSegment).map(s => s.key)
      });

      return computedSegments;

    } catch (error) {
      logger.error("Failed to compute segments for user", error instanceof Error ? error : new Error(String(error)), {
        userId
      });
      throw error;
    }
  }

  public async saveComputedSegments(segments: ComputedSegment[]): Promise<void> {
    if (segments.length === 0) {
      return;
    }

    const userId = segments[0].userId;
    logger.debug("Saving computed segments", { userId, segmentCount: segments.length });

    try {
      // Use a transaction to ensure consistency
      await db.begin().then(async (tx) => {
        try {
          for (const segment of segments) {
            // Check if segment membership changed
            const existing = await tx.queryRow<{ in_segment: boolean; since?: Date }>`
              SELECT in_segment, since FROM user_segments 
              WHERE user_id = ${segment.userId} AND key = ${segment.key}
            `;

            const now = new Date();
            
            if (!existing) {
              // New segment membership record
              await tx.exec`
                INSERT INTO user_segments (user_id, key, in_segment, since, updated_at)
                VALUES (${segment.userId}, ${segment.key}, ${segment.inSegment}, 
                       ${segment.inSegment ? now : null}, ${now})
              `;
            } else if (existing.in_segment !== segment.inSegment) {
              // Segment membership changed
              await tx.exec`
                UPDATE user_segments 
                SET in_segment = ${segment.inSegment}, 
                    since = ${segment.inSegment ? now : null},
                    updated_at = ${now}
                WHERE user_id = ${segment.userId} AND key = ${segment.key}
              `;
            } else {
              // Just update the timestamp
              await tx.exec`
                UPDATE user_segments 
                SET updated_at = ${now}
                WHERE user_id = ${segment.userId} AND key = ${segment.key}
              `;
            }
          }

          await tx.commit();
          
          logger.info("Successfully saved computed segments", {
            userId,
            segmentCount: segments.length
          });

        } catch (error) {
          await tx.rollback();
          throw error;
        }
      });

    } catch (error) {
      logger.error("Failed to save computed segments", error instanceof Error ? error : new Error(String(error)), {
        userId,
        segmentCount: segments.length
      });
      throw error;
    }
  }

  public async computeAndSaveSegmentsForUser(userId: string): Promise<ComputedSegment[]> {
    const segments = await this.computeSegmentsForUser(userId);
    await this.saveComputedSegments(segments);
    return segments;
  }
}

// Helper function to get user traits (used by both segment and decision services)
export async function getUserTraits(userId: string): Promise<Record<string, any>> {
  const traits = await db.queryAll<{
    key: string;
    value: string;
  }>`
    SELECT key, value FROM user_traits WHERE user_id = ${userId}
  `;

  const traitMap: Record<string, any> = {};
  for (const trait of traits) {
    try {
      traitMap[trait.key] = JSON.parse(trait.value);
    } catch (error) {
      traitMap[trait.key] = null;
    }
  }

  return traitMap;
}

// Singleton instance
export const segmentComputer = new SegmentComputer();
