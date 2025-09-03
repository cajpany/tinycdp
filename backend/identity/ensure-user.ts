import { api } from "encore.dev/api";
import { db } from "./db";
import { createLogger } from "../shared/logger";
import { ServiceError } from "../shared/errors";
import type { User } from "../shared/types";

const logger = createLogger("identity");

export interface EnsureUserParams {
  deviceId?: string;
  externalId?: string;
  emailHash?: string;
}

export interface EnsureUserResponse {
  user: User;
  created: boolean;
}

// Ensures a user exists, creating one if necessary based on provided identifiers.
export const ensureUser = api<EnsureUserParams, EnsureUserResponse>(
  { method: "POST", path: "/identity/ensure-user" },
  async (params) => {
    logger.info("Ensuring user exists", { 
      hasDeviceId: !!params.deviceId,
      hasExternalId: !!params.externalId,
      hasEmailHash: !!params.emailHash
    });

    if (!params.deviceId && !params.externalId && !params.emailHash) {
      throw new ServiceError(
        "MISSING_IDENTIFIER",
        "At least one identifier (deviceId, externalId, or emailHash) is required",
        400
      );
    }

    try {
      // First, try to find an existing user by any of the provided identifiers
      let existingUser: User | null = null;

      for (const [kind, value] of Object.entries(params)) {
        if (value && ['deviceId', 'externalId', 'emailHash'].includes(kind)) {
          logger.debug("Looking up user by alias", { kind, value });
          
          const userAlias = await db.queryRow<{ user_id: string }>`
            SELECT user_id FROM user_aliases WHERE kind = ${kind} AND value = ${value}
          `;

          if (userAlias) {
            logger.debug("Found existing user via alias", { userId: userAlias.user_id, kind });
            
            existingUser = await db.queryRow<User>`
              SELECT id, created_at FROM users WHERE id = ${userAlias.user_id}
            `;
            
            if (existingUser) {
              logger.info("Found existing user", { userId: existingUser.id });
              
              // Link any additional aliases that weren't already linked
              await linkMissingAliases(existingUser.id, params);
              
              return {
                user: existingUser,
                created: false
              };
            }
          }
        }
      }

      // No existing user found, create a new one
      logger.debug("Creating new user");
      
      const newUser = await db.queryRow<User>`
        INSERT INTO users DEFAULT VALUES
        RETURNING id, created_at
      `;

      if (!newUser) {
        throw new ServiceError("USER_CREATION_FAILED", "Failed to create new user", 500);
      }

      logger.info("Created new user", { userId: newUser.id });

      // Link all provided aliases to the new user
      await linkMissingAliases(newUser.id, params);

      return {
        user: newUser,
        created: true
      };

    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      
      logger.error("Failed to ensure user", error instanceof Error ? error : new Error(String(error)));
      throw new ServiceError("INTERNAL_ERROR", "Failed to ensure user exists", 500);
    }
  }
);

async function linkMissingAliases(userId: string, params: EnsureUserParams): Promise<void> {
  for (const [kind, value] of Object.entries(params)) {
    if (value && ['deviceId', 'externalId', 'emailHash'].includes(kind)) {
      try {
        // Check if this alias already exists for this user
        const existing = await db.queryRow`
          SELECT 1 FROM user_aliases 
          WHERE user_id = ${userId} AND kind = ${kind} AND value = ${value}
        `;

        if (!existing) {
          logger.debug("Linking alias to user", { userId, kind, value });
          
          await db.exec`
            INSERT INTO user_aliases (user_id, kind, value) 
            VALUES (${userId}, ${kind}, ${value})
            ON CONFLICT (kind, value) DO NOTHING
          `;

          logger.info("Linked alias to user", { userId, kind });
        }
      } catch (error) {
        // Log but don't fail the whole operation for alias linking errors
        logger.warn("Failed to link alias", { userId, kind, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }
}
