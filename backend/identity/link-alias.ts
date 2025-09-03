import { api } from "encore.dev/api";
import { db } from "./db";
import { createLogger } from "../shared/logger";
import { ServiceError } from "../shared/errors";

const logger = createLogger("identity");

export interface LinkAliasParams {
  userId: string;
  kind: 'deviceId' | 'externalId' | 'emailHash';
  value: string;
}

// Links an alias to an existing user.
export const linkAlias = api<LinkAliasParams, void>(
  { method: "POST", path: "/identity/link-alias" },
  async (params) => {
    logger.info("Linking alias to user", { 
      userId: params.userId, 
      kind: params.kind,
      value: params.value
    });

    try {
      // Verify user exists
      const user = await db.queryRow`
        SELECT 1 FROM users WHERE id = ${params.userId}
      `;

      if (!user) {
        throw new ServiceError("USER_NOT_FOUND", "User not found", 404);
      }

      // Check if this alias is already linked to a different user
      const existingAlias = await db.queryRow<{ user_id: string }>`
        SELECT user_id FROM user_aliases 
        WHERE kind = ${params.kind} AND value = ${params.value}
      `;

      if (existingAlias && existingAlias.user_id !== params.userId) {
        throw new ServiceError(
          "ALIAS_ALREADY_EXISTS",
          "This alias is already linked to a different user",
          409,
          { conflictingUserId: existingAlias.user_id }
        );
      }

      if (existingAlias && existingAlias.user_id === params.userId) {
        logger.info("Alias already linked to this user", { 
          userId: params.userId, 
          kind: params.kind 
        });
        return;
      }

      // Link the alias
      await db.exec`
        INSERT INTO user_aliases (user_id, kind, value) 
        VALUES (${params.userId}, ${params.kind}, ${params.value})
      `;

      logger.info("Successfully linked alias to user", { 
        userId: params.userId, 
        kind: params.kind 
      });

    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      
      logger.error("Failed to link alias", error instanceof Error ? error : new Error(String(error)), {
        userId: params.userId,
        kind: params.kind
      });
      throw new ServiceError("INTERNAL_ERROR", "Failed to link alias", 500);
    }
  }
);
