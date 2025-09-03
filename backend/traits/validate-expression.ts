import { api } from "encore.dev/api";
import { createLogger } from "../shared/logger";
import { handleServiceError } from "../shared/errors";
import { validateTraitExpression } from "../shared/traits-dsl";

const logger = createLogger("traits");

export interface ValidateExpressionParams {
  expression: string;
}

export interface ValidateExpressionResponse {
  valid: boolean;
  error?: string;
}

// Validates a trait expression without evaluating it.
export const validateExpression = api<ValidateExpressionParams, ValidateExpressionResponse>(
  { method: "POST", path: "/traits/validate" },
  async (params) => {
    try {
      logger.info("Validating trait expression", { expression: params.expression });

      const result = validateTraitExpression(params.expression);

      logger.info("Expression validation completed", {
        expression: params.expression,
        valid: result.valid,
        hasError: !!result.error
      });

      return result;

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "validateExpression",
        expression: params.expression
      });
    }
  }
);
