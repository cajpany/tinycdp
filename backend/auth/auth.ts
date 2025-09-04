import { secret } from "encore.dev/config";
import { createLogger } from "../shared/logger";
import { AuthContext, AuthParams } from "../shared/auth";

const logger = createLogger("auth-service");

// Encore secrets for API keys (must be defined globally within service)
const adminAPIKey = secret("ADMIN_API_KEY");
const writeAPIKey = secret("WRITE_API_KEY");
const readAPIKey = secret("READ_API_KEY");

// Validate API key against Encore secrets
export async function validateWithSecrets(params: AuthParams): Promise<AuthContext | null> {
  const key = params.authorization?.replace('Bearer ', '') ?? params.apiKey;
  if (!key) {
    return null;
  }

  try {
    // Check against secrets in order of permission level
    if (key === adminAPIKey()) {
      logger.debug("Admin API key validated from secrets");
      return { keyId: "admin-secret", kind: "admin" };
    }
    
    if (key === writeAPIKey()) {
      logger.debug("Write API key validated from secrets");
      return { keyId: "write-secret", kind: "write" };
    }
    
    if (key === readAPIKey()) {
      logger.debug("Read API key validated from secrets");
      return { keyId: "read-secret", kind: "read" };
    }

    logger.warn("Invalid API key (not found in secrets)");
    return null;
  } catch (error) {
    logger.error("Failed to validate API key from secrets", error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
