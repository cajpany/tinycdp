import { api } from "encore.dev/api";
import { db } from "./db";
import { createLogger } from "../shared/logger";
import { ServiceError, handleServiceError } from "../shared/errors";

const logger = createLogger("segments");

export interface GetUserSegmentsParams {
  userId: string;
}

export interface UserSegment {
  key: string;
  inSegment: boolean;
  since?: Date;
  updated_at: Date;
}

export interface GetUserSegmentsResponse {
  segments: UserSegment[];
}

// Retrieves all computed segments for a user.
export const getUserSegments = api<GetUserSegmentsParams, GetUserSegmentsResponse>(
  { method: "GET", path: "/segments/user/:userId" },
  async (params) => {
    try {
      logger.info("Getting segments for user", { userId: params.userId });

      // Validate userId
      if (!params.userId || params.userId.trim() === '') {
        throw new ServiceError(
          "INVALID_USER_ID",
          "User ID is required and cannot be empty",
          400
        );
      }

      const segments = await db.queryAll<UserSegment>`
        SELECT key, in_segment, since, updated_at 
        FROM user_segments 
        WHERE user_id = ${params.userId}
        ORDER BY key
      `;

      logger.info("Retrieved user segments", {
        userId: params.userId,
        segmentCount: segments.length,
        activeSegments: segments.filter(s => s.inSegment).length
      });

      return {
        segments
      };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "getUserSegments",
        userId: params.userId
      });
    }
  }
);
