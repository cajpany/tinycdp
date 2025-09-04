import { api } from "encore.dev/api";
import { db } from "./db";
import { createLogger } from "../shared/logger";
import { ServiceError, handleServiceError } from "../shared/errors";
import { requireAuth, type AuthParams } from "../shared/auth";
import { getUserTraits } from "../shared/segment-computation";
import { Query } from "encore.dev/api";

const logger = createLogger("decide");

export interface DecideParams extends AuthParams {
  userId: Query<string>;
  flag: Query<string>;
}

export interface DecideResponse {
  allow: boolean;
  variant?: string;
  reasons: string[];
  userId: string;
  flag: string;
}

// In-memory cache for decisions (60 second TTL)
const decisionCache = new Map<string, { 
  response: DecideResponse; 
  expiresAt: number 
}>();

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

// Decides whether a flag should be enabled for a user.
export const decide = api<DecideParams, DecideResponse>(
  { expose: true, method: "GET", path: "/v1/decide" },
  async (params) => {
    try {
      // Require read permission
      await requireAuth('read', params);

      const userId = params.userId;
      const flagKey = params.flag;

      logger.info("Processing decide request", { userId, flagKey });

      // Validate inputs
      if (!userId || userId.trim() === '') {
        throw new ServiceError(
          "INVALID_USER_ID",
          "userId parameter is required and cannot be empty",
          400
        );
      }

      if (!flagKey || flagKey.trim() === '') {
        throw new ServiceError(
          "INVALID_FLAG_KEY",
          "flag parameter is required and cannot be empty",
          400
        );
      }

      // Check cache first
      const cacheKey = `${userId}:${flagKey}`;
      const cached = decisionCache.get(cacheKey);
      
      if (cached && cached.expiresAt > Date.now()) {
        logger.debug("Returning cached decision", { 
          userId, 
          flagKey, 
          cached: true,
          ttlRemaining: cached.expiresAt - Date.now()
        });
        return cached.response;
      }

      // Get flag definition
      const flag = await db.queryRow<{ key: string; rule: string }>`
        SELECT key, rule FROM flags WHERE key = ${flagKey}
      `;

      if (!flag) {
        throw new ServiceError(
          "FLAG_NOT_FOUND",
          `Flag '${flagKey}' not found`,
          404
        );
      }

      // Evaluate flag rule
      const result = await evaluateFlagRule(flag.rule, userId);

      const response: DecideResponse = {
        allow: result.allow,
        variant: result.variant,
        reasons: result.reasons,
        userId,
        flag: flagKey
      };

      // Cache the result
      decisionCache.set(cacheKey, {
        response,
        expiresAt: Date.now() + CACHE_TTL_MS
      });

      logger.info("Successfully processed decide request", {
        userId,
        flagKey,
        allow: result.allow,
        cached: false,
        reasons: result.reasons
      });

      return response;

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "decide",
        userId: params.userId,
        flagKey: params.flag
      });
    }
  }
);

interface FlagEvaluationResult {
  allow: boolean;
  variant?: string;
  reasons: string[];
}

async function evaluateFlagRule(rule: string, userId: string): Promise<FlagEvaluationResult> {
  const reasons: string[] = [];
  
  try {
    logger.debug("Evaluating flag rule", { rule, userId });

    // For now, we support simple rules:
    // - segment("segment_key") - check if user is in segment
    // - trait("trait_key") - get trait value
    // - Boolean expressions combining the above

    // Get user traits and segments
    const [traits, segments] = await Promise.all([
      getUserTraits(userId),
      getUserSegments(userId)
    ]);

    // Replace segment() and trait() function calls with actual values
    let expression = rule;

    // Replace segment("key") calls
    const segmentMatches = rule.match(/segment\("([^"]+)"\)/g);
    if (segmentMatches) {
      for (const match of segmentMatches) {
        const segmentKey = match.match(/segment\("([^"]+)"\)/)?.[1];
        if (segmentKey) {
          const inSegment = segments[segmentKey] || false;
          expression = expression.replace(match, inSegment.toString());
          reasons.push(`segment(${segmentKey}) = ${inSegment}`);
        }
      }
    }

    // Replace trait("key") calls
    const traitMatches = rule.match(/trait\("([^"]+)"\)/g);
    if (traitMatches) {
      for (const match of traitMatches) {
        const traitKey = match.match(/trait\("([^"]+)"\)/)?.[1];
        if (traitKey) {
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
          
          expression = expression.replace(match, replacement);
          reasons.push(`trait(${traitKey}) = ${JSON.stringify(traitValue)}`);
        }
      }
    }

    logger.debug("Evaluating transformed flag expression", { 
      originalRule: rule, 
      transformedExpression: expression,
      reasons
    });

    // Evaluate the expression
    const result = new Function(`return ${expression}`)();
    const allow = Boolean(result);

    reasons.push(`final_result = ${allow}`);

    return {
      allow,
      reasons
    };

  } catch (error) {
    logger.error("Failed to evaluate flag rule", error instanceof Error ? error : new Error(String(error)), {
      rule,
      userId
    });
    
    reasons.push(`evaluation_error: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      allow: false,
      reasons
    };
  }
}

async function getUserSegments(userId: string): Promise<Record<string, boolean>> {
  const segments = await db.queryAll<{
    key: string;
    in_segment: boolean;
  }>`
    SELECT key, in_segment FROM user_segments WHERE user_id = ${userId}
  `;

  const segmentMap: Record<string, boolean> = {};
  for (const segment of segments) {
    segmentMap[segment.key] = segment.in_segment;
  }

  return segmentMap;
}

// Clear expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of decisionCache.entries()) {
    if (value.expiresAt <= now) {
      decisionCache.delete(key);
    }
  }
}, 30000); // Clean every 30 seconds
