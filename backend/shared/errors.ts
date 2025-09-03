import { APIError } from "encore.dev/api";
import { Logger } from "./logger";

export class ServiceError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toAPIError(): APIError {
    switch (this.statusCode) {
      case 400:
        return APIError.invalidArgument(this.message).withDetails(this.details);
      case 401:
        return APIError.unauthenticated(this.message).withDetails(this.details);
      case 403:
        return APIError.permissionDenied(this.message).withDetails(this.details);
      case 404:
        return APIError.notFound(this.message).withDetails(this.details);
      case 409:
        return APIError.alreadyExists(this.message).withDetails(this.details);
      case 429:
        return APIError.resourceExhausted(this.message).withDetails(this.details);
      default:
        return APIError.internal(this.message).withDetails(this.details);
    }
  }
}

export function handleServiceError(error: unknown, logger: Logger, context?: Record<string, unknown>): never {
  if (error instanceof ServiceError) {
    logger.error(`Service error: ${error.message}`, error, context);
    throw error.toAPIError();
  }

  if (error instanceof Error) {
    logger.error(`Unexpected error: ${error.message}`, error, context);
    throw APIError.internal("Internal server error").withDetails({
      originalError: error.message
    });
  }

  logger.error("Unknown error occurred", undefined, { error, ...context });
  throw APIError.internal("Unknown error occurred");
}

export function wrapAsync<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  logger: Logger,
  context?: Record<string, unknown>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleServiceError(error, logger, context);
    }
  };
}
