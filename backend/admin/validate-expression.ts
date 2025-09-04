import { api } from "encore.dev/api";
import { createLogger } from "../shared/logger";
import { ServiceError, handleServiceError } from "../shared/errors";
import { requireAuth, type AuthParams } from "../shared/auth";
import { validateTraitExpression } from "../shared/traits-dsl";

const logger = createLogger("admin");

export interface ValidateExpressionParams extends AuthParams {
  expression: string;
  type: 'trait' | 'segment' | 'flag';
}

export interface ValidateExpressionResponse {
  valid: boolean;
  error?: string;
  ast?: any;
}

// Validates trait expressions, segment rules, or flag rules.
export const validateExpression = api<ValidateExpressionParams, ValidateExpressionResponse>(
  { expose: true, method: "POST", path: "/v1/admin/validate" },
  async (params) => {
    try {
      await requireAuth('read', params);

      logger.info("Validating expression", { 
        type: params.type,
        expression: params.expression 
      });

      if (!params.expression || params.expression.trim() === '') {
        throw new ServiceError(
          "INVALID_EXPRESSION",
          "Expression is required and cannot be empty",
          400
        );
      }

      let result: { valid: boolean; error?: string; ast?: any };

      switch (params.type) {
        case 'trait':
          // Validate trait expression using DSL
          result = validateTraitExpression(params.expression);
          break;

        case 'segment':
          // For segments, we validate as a simple boolean expression
          // This is a simplified validation - in production you might want more sophisticated parsing
          try {
            // Check for basic patterns that segment rules should follow
            const segmentPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\s*(==|!=|>|<|>=|<=)\s*(true|false|null|\d+(\.\d+)?|"[^"]*"))?(\s*(&&|\|\|)\s*[a-zA-Z_][a-zA-Z0-9_]*(\s*(==|!=|>|<|>=|<=)\s*(true|false|null|\d+(\.\d+)?|"[^"]*"))?)*$/;
            
            if (segmentPattern.test(params.expression.trim())) {
              result = { valid: true };
            } else {
              result = { 
                valid: false, 
                error: "Segment rule should be a boolean expression using trait names (e.g., 'power_user == true')" 
              };
            }
          } catch (error) {
            result = { 
              valid: false, 
              error: error instanceof Error ? error.message : "Invalid segment rule" 
            };
          }
          break;

        case 'flag':
          // For flags, we allow segment() and trait() function calls
          try {
            // Check for basic patterns that flag rules should follow
            const flagPattern = /^(segment\("[^"]+"\)|trait\("[^"]+"\)|\w+|true|false)(\s*(==|!=|>|<|>=|<=)\s*(true|false|null|\d+(\.\d+)?|"[^"]*"))?(\s*(&&|\|\|)\s*(segment\("[^"]+"\)|trait\("[^"]+"\)|\w+|true|false)(\s*(==|!=|>|<|>=|<=)\s*(true|false|null|\d+(\.\d+)?|"[^"]*"))?)*$/;
            
            if (flagPattern.test(params.expression.trim())) {
              result = { valid: true };
            } else {
              result = { 
                valid: false, 
                error: "Flag rule should use segment() or trait() functions (e.g., 'segment(\"power_users\")')" 
              };
            }
          } catch (error) {
            result = { 
              valid: false, 
              error: error instanceof Error ? error.message : "Invalid flag rule" 
            };
          }
          break;

        default:
          throw new ServiceError(
            "INVALID_TYPE",
            "Type must be one of: trait, segment, flag",
            400
          );
      }

      logger.info("Expression validation completed", {
        type: params.type,
        expression: params.expression,
        valid: result.valid,
        hasError: !!result.error
      });

      return result;

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "validateExpression",
        type: params.type,
        expression: params.expression
      });
    }
  }
);
