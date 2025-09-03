import { api } from "encore.dev/api";
import { db } from "./db";
import { createLogger } from "../shared/logger";
import { ServiceError, handleServiceError } from "../shared/errors";
import { requireAuth, type AuthParams } from "../shared/auth";
import { validateTraitExpression } from "../shared/traits-dsl";

const logger = createLogger("admin");

export interface CreateTraitParams extends AuthParams {
  key: string;
  expression: string;
}

export interface UpdateTraitParams extends AuthParams {
  key: string;
  expression: string;
}

export interface DeleteTraitParams extends AuthParams {
  key: string;
}

export interface TraitDef {
  id: string;
  key: string;
  expression: string;
  updated_at: Date;
}

export interface CreateTraitResponse {
  trait: TraitDef;
}

export interface ListTraitsResponse {
  traits: TraitDef[];
}

// Creates a new trait definition.
export const createTrait = api<CreateTraitParams, CreateTraitResponse>(
  { expose: true, method: "POST", path: "/v1/admin/traits" },
  async (params) => {
    try {
      await requireAuth('admin', params.authorization);

      logger.info("Creating trait definition", { key: params.key });

      // Validate inputs
      if (!params.key || params.key.trim() === '') {
        throw new ServiceError(
          "INVALID_TRAIT_KEY",
          "Trait key is required and cannot be empty",
          400
        );
      }

      if (!params.expression || params.expression.trim() === '') {
        throw new ServiceError(
          "INVALID_EXPRESSION",
          "Trait expression is required and cannot be empty",
          400
        );
      }

      // Validate trait key format (alphanumeric + underscores only)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(params.key)) {
        throw new ServiceError(
          "INVALID_TRAIT_KEY_FORMAT",
          "Trait key must start with a letter or underscore and contain only letters, numbers, and underscores",
          400
        );
      }

      // Validate expression syntax
      const validation = validateTraitExpression(params.expression);
      if (!validation.valid) {
        throw new ServiceError(
          "INVALID_EXPRESSION_SYNTAX",
          `Expression syntax error: ${validation.error}`,
          400
        );
      }

      // Check if trait key already exists
      const existing = await db.queryRow`
        SELECT 1 FROM trait_defs WHERE key = ${params.key}
      `;

      if (existing) {
        throw new ServiceError(
          "TRAIT_KEY_EXISTS",
          `Trait with key '${params.key}' already exists`,
          409
        );
      }

      // Create the trait
      const trait = await db.queryRow<TraitDef>`
        INSERT INTO trait_defs (key, expression)
        VALUES (${params.key}, ${params.expression})
        RETURNING id, key, expression, updated_at
      `;

      if (!trait) {
        throw new ServiceError("TRAIT_CREATION_FAILED", "Failed to create trait", 500);
      }

      logger.info("Successfully created trait definition", {
        traitId: trait.id,
        key: params.key
      });

      return { trait };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "createTrait",
        key: params.key
      });
    }
  }
);

// Lists all trait definitions.
export const listTraits = api<AuthParams, ListTraitsResponse>(
  { expose: true, method: "GET", path: "/v1/admin/traits" },
  async (params) => {
    try {
      await requireAuth('read', params.authorization);

      logger.info("Listing trait definitions");

      const traits = await db.queryAll<TraitDef>`
        SELECT id, key, expression, updated_at 
        FROM trait_defs 
        ORDER BY key
      `;

      logger.info("Retrieved trait definitions", { count: traits.length });

      return { traits };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "listTraits"
      });
    }
  }
);

// Updates an existing trait definition.
export const updateTrait = api<UpdateTraitParams, CreateTraitResponse>(
  { expose: true, method: "PUT", path: "/v1/admin/traits/:key" },
  async (params) => {
    try {
      await requireAuth('admin', params.authorization);

      logger.info("Updating trait definition", { key: params.key });

      // Validate expression
      if (!params.expression || params.expression.trim() === '') {
        throw new ServiceError(
          "INVALID_EXPRESSION",
          "Trait expression is required and cannot be empty",
          400
        );
      }

      // Validate expression syntax
      const validation = validateTraitExpression(params.expression);
      if (!validation.valid) {
        throw new ServiceError(
          "INVALID_EXPRESSION_SYNTAX",
          `Expression syntax error: ${validation.error}`,
          400
        );
      }

      // Update the trait
      const trait = await db.queryRow<TraitDef>`
        UPDATE trait_defs 
        SET expression = ${params.expression}, updated_at = NOW()
        WHERE key = ${params.key}
        RETURNING id, key, expression, updated_at
      `;

      if (!trait) {
        throw new ServiceError("TRAIT_NOT_FOUND", "Trait not found", 404);
      }

      logger.info("Successfully updated trait definition", {
        traitId: trait.id,
        key: params.key
      });

      return { trait };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "updateTrait",
        key: params.key
      });
    }
  }
);

// Deletes a trait definition.
export const deleteTrait = api<DeleteTraitParams, void>(
  { expose: true, method: "DELETE", path: "/v1/admin/traits/:key" },
  async (params) => {
    try {
      await requireAuth('admin', params.authorization);

      logger.info("Deleting trait definition", { key: params.key });

      // Delete the trait definition (this will also cascade to user_traits)
      const result = await db.queryRow<{ key: string }>`
        DELETE FROM trait_defs 
        WHERE key = ${params.key}
        RETURNING key
      `;

      if (!result) {
        throw new ServiceError("TRAIT_NOT_FOUND", "Trait not found", 404);
      }

      // Also delete computed trait values for all users
      await db.exec`
        DELETE FROM user_traits WHERE key = ${params.key}
      `;

      logger.info("Successfully deleted trait definition", { key: params.key });

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "deleteTrait",
        key: params.key
      });
    }
  }
);
