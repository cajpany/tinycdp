import { api } from "encore.dev/api";
import { db } from "./db";
import { createLogger } from "../shared/logger";
import { ServiceError, handleServiceError } from "../shared/errors";
import { requireAuth, type AuthParams } from "../shared/auth";

const logger = createLogger("admin");

export interface CreateSegmentParams extends AuthParams {
  key: string;
  rule: string;
}

export interface UpdateSegmentParams extends AuthParams {
  key: string;
  rule: string;
}

export interface DeleteSegmentParams extends AuthParams {
  key: string;
}

export interface SegmentDef {
  id: string;
  key: string;
  rule: string;
  updated_at: Date;
}

export interface CreateSegmentResponse {
  segment: SegmentDef;
}

export interface ListSegmentsResponse {
  segments: SegmentDef[];
}

// Creates a new segment definition.
export const createSegment = api<CreateSegmentParams, CreateSegmentResponse>(
  { expose: true, method: "POST", path: "/v1/admin/segments" },
  async (params) => {
    try {
      await requireAuth('admin', params);

      logger.info("Creating segment definition", { key: params.key });

      // Validate inputs
      if (!params.key || params.key.trim() === '') {
        throw new ServiceError(
          "INVALID_SEGMENT_KEY",
          "Segment key is required and cannot be empty",
          400
        );
      }

      if (!params.rule || params.rule.trim() === '') {
        throw new ServiceError(
          "INVALID_RULE",
          "Segment rule is required and cannot be empty",
          400
        );
      }

      // Validate segment key format (alphanumeric + underscores only)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(params.key)) {
        throw new ServiceError(
          "INVALID_SEGMENT_KEY_FORMAT",
          "Segment key must start with a letter or underscore and contain only letters, numbers, and underscores",
          400
        );
      }

      // Check if segment key already exists
      const existing = await db.queryRow`
        SELECT 1 FROM segment_defs WHERE key = ${params.key}
      `;

      if (existing) {
        throw new ServiceError(
          "SEGMENT_KEY_EXISTS",
          `Segment with key '${params.key}' already exists`,
          409
        );
      }

      // Create the segment
      const segment = await db.queryRow<SegmentDef>`
        INSERT INTO segment_defs (key, rule)
        VALUES (${params.key}, ${params.rule})
        RETURNING id, key, rule, updated_at
      `;

      if (!segment) {
        throw new ServiceError("SEGMENT_CREATION_FAILED", "Failed to create segment", 500);
      }

      logger.info("Successfully created segment definition", {
        segmentId: segment.id,
        key: params.key
      });

      return { segment };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "createSegment",
        key: params.key
      });
    }
  }
);

// Lists all segment definitions.
export const listSegments = api<AuthParams, ListSegmentsResponse>(
  { expose: true, method: "GET", path: "/v1/admin/segments" },
  async (params) => {
    try {
      await requireAuth('read', params);

      logger.info("Listing segment definitions");

      const segments = await db.queryAll<SegmentDef>`
        SELECT id, key, rule, updated_at 
        FROM segment_defs 
        ORDER BY key
      `;

      logger.info("Retrieved segment definitions", { count: segments.length });

      return { segments };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "listSegments"
      });
    }
  }
);

// Updates an existing segment definition.
export const updateSegment = api<UpdateSegmentParams, CreateSegmentResponse>(
  { expose: true, method: "PUT", path: "/v1/admin/segments/:key" },
  async (params) => {
    try {
      await requireAuth('admin', params);

      logger.info("Updating segment definition", { key: params.key });

      // Validate rule
      if (!params.rule || params.rule.trim() === '') {
        throw new ServiceError(
          "INVALID_RULE",
          "Segment rule is required and cannot be empty",
          400
        );
      }

      // Update the segment
      const segment = await db.queryRow<SegmentDef>`
        UPDATE segment_defs 
        SET rule = ${params.rule}, updated_at = NOW()
        WHERE key = ${params.key}
        RETURNING id, key, rule, updated_at
      `;

      if (!segment) {
        throw new ServiceError("SEGMENT_NOT_FOUND", "Segment not found", 404);
      }

      logger.info("Successfully updated segment definition", {
        segmentId: segment.id,
        key: params.key
      });

      return { segment };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "updateSegment",
        key: params.key
      });
    }
  }
);

// Deletes a segment definition.
export const deleteSegment = api<DeleteSegmentParams, void>(
  { expose: true, method: "DELETE", path: "/v1/admin/segments/:key" },
  async (params) => {
    try {
      await requireAuth('admin', params);

      logger.info("Deleting segment definition", { key: params.key });

      // Delete the segment definition
      const result = await db.queryRow<{ key: string }>`
        DELETE FROM segment_defs 
        WHERE key = ${params.key}
        RETURNING key
      `;

      if (!result) {
        throw new ServiceError("SEGMENT_NOT_FOUND", "Segment not found", 404);
      }

      // Also delete computed segment values for all users
      await db.exec`
        DELETE FROM user_segments WHERE key = ${params.key}
      `;

      logger.info("Successfully deleted segment definition", { key: params.key });

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "deleteSegment",
        key: params.key
      });
    }
  }
);
