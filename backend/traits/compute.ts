import { api } from "encore.dev/api";
import { createLogger } from "../shared/logger";
import { ServiceError, handleServiceError } from "../shared/errors";
import { traitComputer } from "../shared/trait-computation";

const logger = createLogger("traits");

export interface ComputeTraitsParams {
  userId: string;
}

export interface ComputeTraitsResponse {
  success: boolean;
  traitsComputed: number;
}

// Computes all traits for a specific user.
export const compute = api<ComputeTraitsParams, ComputeTraitsResponse>(
  { method: "POST", path: "/traits/compute" },
  async (params) => {
    try {
      logger.info("Computing traits for user", { userId: params.userId });

      // Validate userId
      if (!params.userId || params.userId.trim() === '') {
        throw new ServiceError(
          "INVALID_USER_ID",
          "User ID is required and cannot be empty",
          400
        );
      }

      const traits = await traitComputer.computeAndSaveTraitsForUser(params.userId);

      logger.info("Successfully computed traits", {
        userId: params.userId,
        traitsComputed: traits.length
      });

      return {
        success: true,
        traitsComputed: traits.length
      };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "compute",
        userId: params.userId
      });
    }
  }
);
