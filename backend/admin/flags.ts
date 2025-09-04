import { api } from "encore.dev/api";
import { db } from "./db";
import { createLogger } from "../shared/logger";
import { ServiceError, handleServiceError } from "../shared/errors";
import { requireAuth, type AuthParams } from "../shared/auth";

const logger = createLogger("admin");

export interface CreateFlagParams extends AuthParams {
  key: string;
  rule: string;
}

export interface UpdateFlagParams extends AuthParams {
  key: string;
  rule: string;
}

export interface DeleteFlagParams extends AuthParams {
  key: string;
}

export interface Flag {
  key: string;
  rule: string;
}

export interface CreateFlagResponse {
  flag: Flag;
}

export interface ListFlagsResponse {
  flags: Flag[];
}

// Creates a new flag definition.
export const createFlag = api<CreateFlagParams, CreateFlagResponse>(
  { expose: true, method: "POST", path: "/v1/admin/flags" },
  async (params) => {
    try {
      await requireAuth('admin', params);

      logger.info("Creating flag definition", { key: params.key });

      // Validate inputs
      if (!params.key || params.key.trim() === '') {
        throw new ServiceError(
          "INVALID_FLAG_KEY",
          "Flag key is required and cannot be empty",
          400
        );
      }

      if (!params.rule || params.rule.trim() === '') {
        throw new ServiceError(
          "INVALID_RULE",
          "Flag rule is required and cannot be empty",
          400
        );
      }

      // Validate flag key format (alphanumeric + underscores only)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(params.key)) {
        throw new ServiceError(
          "INVALID_FLAG_KEY_FORMAT",
          "Flag key must start with a letter or underscore and contain only letters, numbers, and underscores",
          400
        );
      }

      // Check if flag key already exists
      const existing = await db.queryRow`
        SELECT 1 FROM flags WHERE key = ${params.key}
      `;

      if (existing) {
        throw new ServiceError(
          "FLAG_KEY_EXISTS",
          `Flag with key '${params.key}' already exists`,
          409
        );
      }

      // Create the flag
      const flag = await db.queryRow<Flag>`
        INSERT INTO flags (key, rule)
        VALUES (${params.key}, ${params.rule})
        RETURNING key, rule
      `;

      if (!flag) {
        throw new ServiceError("FLAG_CREATION_FAILED", "Failed to create flag", 500);
      }

      logger.info("Successfully created flag definition", {
        key: params.key
      });

      return { flag };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "createFlag",
        key: params.key
      });
    }
  }
);

// Lists all flag definitions.
export const listFlags = api<AuthParams, ListFlagsResponse>(
  { expose: true, method: "GET", path: "/v1/admin/flags" },
  async (params) => {
    try {
      await requireAuth('read', params);

      logger.info("Listing flag definitions");

      const flags = await db.queryAll<Flag>`
        SELECT key, rule 
        FROM flags 
        ORDER BY key
      `;

      logger.info("Retrieved flag definitions", { count: flags.length });

      return { flags };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "listFlags"
      });
    }
  }
);

// Updates an existing flag definition.
export const updateFlag = api<UpdateFlagParams, CreateFlagResponse>(
  { expose: true, method: "PUT", path: "/v1/admin/flags/:key" },
  async (params) => {
    try {
      await requireAuth('admin', params);

      logger.info("Updating flag definition", { key: params.key });

      // Validate rule
      if (!params.rule || params.rule.trim() === '') {
        throw new ServiceError(
          "INVALID_RULE",
          "Flag rule is required and cannot be empty",
          400
        );
      }

      // Update the flag
      const flag = await db.queryRow<Flag>`
        UPDATE flags 
        SET rule = ${params.rule}
        WHERE key = ${params.key}
        RETURNING key, rule
      `;

      if (!flag) {
        throw new ServiceError("FLAG_NOT_FOUND", "Flag not found", 404);
      }

      logger.info("Successfully updated flag definition", {
        key: params.key
      });

      return { flag };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "updateFlag",
        key: params.key
      });
    }
  }
);

// Deletes a flag definition.
export const deleteFlag = api<DeleteFlagParams, void>(
  { expose: true, method: "DELETE", path: "/v1/admin/flags/:key" },
  async (params) => {
    try {
      await requireAuth('admin', params);

      logger.info("Deleting flag definition", { key: params.key });

      // Delete the flag definition
      const result = await db.queryRow<{ key: string }>`
        DELETE FROM flags 
        WHERE key = ${params.key}
        RETURNING key
      `;

      if (!result) {
        throw new ServiceError("FLAG_NOT_FOUND", "Flag not found", 404);
      }

      logger.info("Successfully deleted flag definition", { key: params.key });

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "deleteFlag",
        key: params.key
      });
    }
  }
);
