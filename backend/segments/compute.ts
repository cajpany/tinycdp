import { api } from "encore.dev/api";
import { createLogger } from "../shared/logger";
import { ServiceError, handleServiceError } from "../shared/errors";
import { segmentComputer } from "../shared/segment-computation";

const logger = createLogger("segments");

export interface ComputeSegmentsParams {
  userId: string;
}

export interface ComputeSegmentsResponse {
  success: boolean;
  segmentsComputed: number;
}

// Computes all segments for a specific user.
export const compute = api<ComputeSegmentsParams, ComputeSegmentsResponse>(
  { method: "POST", path: "/segments/compute" },
  async (params) => {
    try {
      logger.info("Computing segments for user", { userId: params.userId });

      // Validate userId
      if (!params.userId || params.userId.trim() === '') {
        throw new ServiceError(
          "INVALID_USER_ID",
          "User ID is required and cannot be empty",
          400
        );
      }

      const segments = await segmentComputer.computeAndSaveSegmentsForUser(params.userId);

      logger.info("Successfully computed segments", {
        userId: params.userId,
        segmentsComputed: segments.length
      });

      return {
        success: true,
        segmentsComputed: segments.length
      };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "compute",
        userId: params.userId
      });
    }
  }
);
