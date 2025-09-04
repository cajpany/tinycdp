import { api } from "encore.dev/api";
import { createLogger } from "../shared/logger";
import { ServiceError, handleServiceError } from "../shared/errors";
import { createAPIKey, requireAuth, type AuthParams } from "../shared/auth";

const logger = createLogger("admin");

export interface CreateKeyParams extends AuthParams {
  kind: 'write' | 'read' | 'admin';
  description?: string;
}

export interface CreateKeyResponse {
  id: string;
  key: string;
  kind: 'write' | 'read' | 'admin';
}

// Creates a new API key.
export const createKey = api<CreateKeyParams, CreateKeyResponse>(
  { expose: true, method: "POST", path: "/v1/admin/keys" },
  async (params) => {
    try {
      // Require admin permission to create API keys
      await requireAuth('admin', params);

      logger.info("Creating new API key", { kind: params.kind });

      // Validate kind
      if (!['write', 'read', 'admin'].includes(params.kind)) {
        throw new ServiceError(
          "INVALID_KEY_KIND",
          "Key kind must be one of: write, read, admin",
          400
        );
      }

      const result = await createAPIKey(params.kind);

      logger.info("Successfully created API key", {
        keyId: result.id,
        kind: params.kind
      });

      return {
        id: result.id,
        key: result.key,
        kind: params.kind
      };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "createKey",
        kind: params.kind
      });
    }
  }
);
