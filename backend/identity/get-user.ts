import { api } from "encore.dev/api";
import { db } from "./db";
import { createLogger } from "../shared/logger";
import { ServiceError } from "../shared/errors";
import type { User, UserAlias } from "../shared/types";

const logger = createLogger("identity");

export interface GetUserParams {
  userId: string;
}

export interface GetUserResponse {
  user: User;
  aliases: UserAlias[];
}

// Retrieves a user by ID along with all their aliases.
export const getUser = api<GetUserParams, GetUserResponse>(
  { method: "GET", path: "/identity/user/:userId" },
  async (params) => {
    logger.info("Getting user", { userId: params.userId });

    try {
      // Get user
      const user = await db.queryRow<User>`
        SELECT id, created_at FROM users WHERE id = ${params.userId}
      `;

      if (!user) {
        throw new ServiceError("USER_NOT_FOUND", "User not found", 404);
      }

      // Get all aliases for this user
      const aliases = await db.queryAll<UserAlias>`
        SELECT user_id, kind, value FROM user_aliases WHERE user_id = ${params.userId}
      `;

      logger.info("Retrieved user with aliases", { 
        userId: params.userId, 
        aliasCount: aliases.length 
      });

      return {
        user,
        aliases
      };

    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      
      logger.error("Failed to get user", error instanceof Error ? error : new Error(String(error)), {
        userId: params.userId
      });
      throw new ServiceError("INTERNAL_ERROR", "Failed to retrieve user", 500);
    }
  }
);
