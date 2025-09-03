import { api } from "encore.dev/api";
import { createLogger } from "../shared/logger";
import { ServiceError, handleServiceError } from "../shared/errors";

const logger = createLogger("decide");

export interface InvalidateCacheParams {
  userId?: string;
  flag?: string;
}

export interface InvalidateCacheResponse {
  success: boolean;
  entriesCleared: number;
}

// Cache reference - this would be shared with decide.ts in a real implementation
// For now, we'll create a simple interface
declare const decisionCache: Map<string, any>;

// Invalidates decision cache entries.
export const invalidateCache = api<InvalidateCacheParams, InvalidateCacheResponse>(
  { method: "POST", path: "/decide/invalidate-cache" },
  async (params) => {
    try {
      logger.info("Invalidating decision cache", { 
        userId: params.userId,
        flag: params.flag
      });

      let entriesCleared = 0;

      // If specific user and flag provided
      if (params.userId && params.flag) {
        const cacheKey = `${params.userId}:${params.flag}`;
        if (typeof decisionCache !== 'undefined' && decisionCache.has(cacheKey)) {
          decisionCache.delete(cacheKey);
          entriesCleared = 1;
        }
      }
      // If only userId provided, clear all entries for that user
      else if (params.userId) {
        if (typeof decisionCache !== 'undefined') {
          for (const key of decisionCache.keys()) {
            if (key.startsWith(`${params.userId}:`)) {
              decisionCache.delete(key);
              entriesCleared++;
            }
          }
        }
      }
      // If only flag provided, clear all entries for that flag
      else if (params.flag) {
        if (typeof decisionCache !== 'undefined') {
          for (const key of decisionCache.keys()) {
            if (key.endsWith(`:${params.flag}`)) {
              decisionCache.delete(key);
              entriesCleared++;
            }
          }
        }
      }
      // If neither provided, clear entire cache
      else {
        if (typeof decisionCache !== 'undefined') {
          entriesCleared = decisionCache.size;
          decisionCache.clear();
        }
      }

      logger.info("Cache invalidation completed", {
        userId: params.userId,
        flag: params.flag,
        entriesCleared
      });

      return {
        success: true,
        entriesCleared
      };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "invalidateCache",
        userId: params.userId,
        flag: params.flag
      });
    }
  }
);
