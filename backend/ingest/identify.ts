import { api } from "encore.dev/api";
import { createLogger } from "../shared/logger";
import { ServiceError, handleServiceError } from "../shared/errors";
import { requireAuth, type AuthParams } from "../shared/auth";
import { identity } from "~encore/clients";

const logger = createLogger("ingest");

export interface IdentifyParams extends AuthParams {
  deviceId?: string;
  userId?: string;
  externalId?: string;
  traits?: Record<string, unknown>;
}

export interface IdentifyResponse {
  userId: string;
  success: boolean;
}

// Creates or updates user identity information.
export const identify = api<IdentifyParams, IdentifyResponse>(
  { expose: true, method: "POST", path: "/v1/identify" },
  async (params) => {
    try {
      // Require write permission
      await requireAuth('write', params.authorization);

      logger.info("Processing identify request", {
        hasDeviceId: !!params.deviceId,
        hasUserId: !!params.userId,
        hasExternalId: !!params.externalId,
        hasTraits: !!params.traits
      });

      // Validate that we have at least one identifier
      if (!params.deviceId && !params.userId && !params.externalId) {
        throw new ServiceError(
          "MISSING_IDENTIFIER",
          "At least one identifier (deviceId, userId, or externalId) is required",
          400
        );
      }

      // Use the identity service to ensure the user exists
      const identifyParams = {
        deviceId: params.deviceId,
        externalId: params.externalId,
        // Convert userId to externalId if provided
        ...(params.userId && { externalId: params.userId })
      };

      const userResult = await identity.ensureUser(identifyParams);

      // TODO: In Phase 3, we'll process traits here
      if (params.traits) {
        logger.debug("Traits provided but not yet processed", {
          userId: userResult.user.id,
          traitCount: Object.keys(params.traits).length
        });
      }

      logger.info("Successfully processed identify request", {
        userId: userResult.user.id,
        created: userResult.created
      });

      return {
        userId: userResult.user.id,
        success: true
      };

    } catch (error) {
      handleServiceError(error, logger, { 
        endpoint: "identify",
        hasDeviceId: !!params.deviceId,
        hasUserId: !!params.userId,
        hasExternalId: !!params.externalId
      });
    }
  }
);
