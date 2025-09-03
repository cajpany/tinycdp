import { api } from "encore.dev/api";
import { db } from "./db";
import { createLogger } from "../shared/logger";
import { ServiceError, handleServiceError } from "../shared/errors";
import { requireAuth, type AuthParams } from "../shared/auth";
import { identity } from "~encore/clients";
import { traits } from "~encore/clients";

const logger = createLogger("ingest");

export interface TrackParams extends AuthParams {
  userId?: string;
  deviceId?: string;
  externalId?: string;
  event: string;
  ts?: string; // ISO datetime
  props?: Record<string, unknown>;
}

export interface TrackResponse {
  success: boolean;
  eventId: number;
}

// Tracks an event for a user.
export const track = api<TrackParams, TrackResponse>(
  { expose: true, method: "POST", path: "/v1/track" },
  async (params) => {
    try {
      // Require write permission
      await requireAuth('write', params.authorization);

      logger.info("Processing track request", {
        event: params.event,
        hasUserId: !!params.userId,
        hasDeviceId: !!params.deviceId,
        hasExternalId: !!params.externalId,
        hasProps: !!params.props,
        hasTimestamp: !!params.ts
      });

      // Validate event name
      if (!params.event || params.event.trim() === '') {
        throw new ServiceError(
          "INVALID_EVENT_NAME",
          "Event name is required and cannot be empty",
          400
        );
      }

      // Validate that we have at least one identifier
      if (!params.userId && !params.deviceId && !params.externalId) {
        throw new ServiceError(
          "MISSING_IDENTIFIER",
          "At least one identifier (userId, deviceId, or externalId) is required",
          400
        );
      }

      // Parse timestamp or use current time
      let eventTimestamp: Date;
      if (params.ts) {
        try {
          eventTimestamp = new Date(params.ts);
          if (isNaN(eventTimestamp.getTime())) {
            throw new Error("Invalid date");
          }
        } catch (error) {
          throw new ServiceError(
            "INVALID_TIMESTAMP",
            "Invalid timestamp format. Use ISO 8601 format (e.g., '2023-01-01T12:00:00Z')",
            400
          );
        }
      } else {
        eventTimestamp = new Date();
      }

      // Ensure user exists using the identity service
      const identifyParams = {
        deviceId: params.deviceId,
        externalId: params.externalId,
        // Convert userId to externalId if provided
        ...(params.userId && { externalId: params.userId })
      };

      const userResult = await identity.ensureUser(identifyParams);
      const userId = userResult.user.id;

      // Store the event
      const eventResult = await db.queryRow<{ id: number }>`
        INSERT INTO events (user_id, ts, name, props)
        VALUES (${userId}, ${eventTimestamp}, ${params.event}, ${params.props ? JSON.stringify(params.props) : null})
        RETURNING id
      `;

      if (!eventResult) {
        throw new ServiceError("EVENT_CREATION_FAILED", "Failed to create event", 500);
      }

      logger.info("Successfully tracked event", {
        eventId: eventResult.id,
        userId,
        event: params.event,
        timestamp: eventTimestamp
      });

      // Trigger trait computation for this user
      try {
        logger.debug("Triggering trait computation", { userId });
        await traits.compute({ userId });
        logger.info("Trait computation triggered", { userId });
      } catch (error) {
        // Log error but don't fail the whole request
        logger.error("Failed to trigger trait computation", error instanceof Error ? error : new Error(String(error)), {
          userId,
          eventId: eventResult.id
        });
      }

      return {
        success: true,
        eventId: eventResult.id
      };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "track",
        event: params.event,
        hasUserId: !!params.userId,
        hasDeviceId: !!params.deviceId,
        hasExternalId: !!params.externalId
      });
    }
  }
);
