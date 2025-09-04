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
    // Try to load secrets - if they fail, return null to fall back to database
    let adminKey: string, writeKey: string, readKey: string;
    
    try {
      adminKey = adminAPIKey();
      writeKey = writeAPIKey();
      readKey = readAPIKey();
    } catch (secretError) {
      logger.debug("Secrets not available (likely development environment), falling back to database");
      return null;
    }

    // Check against secrets in order of permission level
    if (key === adminKey) {
      logger.debug("Admin API key validated from secrets");
      return { keyId: "admin-secret", kind: "admin" };
    }
    
    if (key === writeKey) {
      logger.debug("Write API key validated from secrets");
      return { keyId: "write-secret", kind: "write" };
    }
    
    if (key === readKey) {
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
