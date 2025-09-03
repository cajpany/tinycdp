import { api } from "encore.dev/api";
import { db } from "./db";
import { createLogger } from "../shared/logger";
import { ServiceError, handleServiceError } from "../shared/errors";

const logger = createLogger("traits");

export interface GetUserTraitsParams {
  userId: string;
}

export interface UserTrait {
  key: string;
  value: any;
  updated_at: Date;
}

export interface GetUserTraitsResponse {
  traits: UserTrait[];
}

// Retrieves all computed traits for a user.
export const getUserTraits = api<GetUserTraitsParams, GetUserTraitsResponse>(
  { method: "GET", path: "/traits/user/:userId" },
  async (params) => {
    try {
      logger.info("Getting traits for user", { userId: params.userId });

      // Validate userId
      if (!params.userId || params.userId.trim() === '') {
        throw new ServiceError(
          "INVALID_USER_ID",
          "User ID is required and cannot be empty",
          400
        );
      }

      const traits = await db.queryAll<{
        key: string;
        value: string;
        updated_at: Date;
      }>`
        SELECT key, value, updated_at 
        FROM user_traits 
        WHERE user_id = ${params.userId}
        ORDER BY key
      `;

      // Parse JSON values
      const parsedTraits: UserTrait[] = traits.map(trait => ({
        key: trait.key,
        value: JSON.parse(trait.value),
        updated_at: trait.updated_at
      }));

      logger.info("Retrieved user traits", {
        userId: params.userId,
        traitCount: parsedTraits.length
      });

      return {
        traits: parsedTraits
      };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "getUserTraits",
        userId: params.userId
      });
    }
  }
);
