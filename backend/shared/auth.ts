import { Header, APIError, Query } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { createHash } from "crypto";
import { db } from "./db";
import { createLogger } from "./logger";

const logger = createLogger("auth");

export interface AuthContext {
  keyId: string;
  kind: 'write' | 'read' | 'admin';
}

export interface AuthParams {
  authorization?: Header<"Authorization">;
  apiKey?: Query<string>;
}

// Hash an API key for storage
export function hashAPIKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// Generate a new API key
export function generateAPIKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Validate API key against Encore secrets (preferred for cloud deployment)
export async function validateAPIKeyFromSecrets(params: AuthParams): Promise<AuthContext | null> {
  const key = params.authorization?.replace('Bearer ', '') ?? params.apiKey;
  if (!key) {
    return null;
  }

  try {
    // Load secrets within function scope (required by Encore)
    const adminAPIKey = secret("ADMIN_API_KEY");
    const writeAPIKey = secret("WRITE_API_KEY");
    const readAPIKey = secret("READ_API_KEY");

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

// Validate API key and return auth context (database-based - fallback)
export async function validateAPIKeyFromDB(params: AuthParams): Promise<AuthContext | null> {
  const key = params.authorization?.replace('Bearer ', '') ?? params.apiKey;
  if (!key) {
    return null;
  }

  const keyHash = hashAPIKey(key);

  try {
    const apiKey = await db.queryRow<{ id: string; kind: 'write' | 'read' | 'admin' }>`
      SELECT id, kind FROM api_keys WHERE key_hash = ${keyHash}
    `;

    if (!apiKey) {
      logger.warn("Invalid API key", { keyHash: keyHash.substring(0, 8) + "..." });
      return null;
    }

    logger.debug("API key validated from database", { keyId: apiKey.id, kind: apiKey.kind });
    return {
      keyId: apiKey.id,
      kind: apiKey.kind
    };
  } catch (error) {
    logger.error("Failed to validate API key from database", error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

// Main validation function - tries secrets first, then database fallback
export async function validateAPIKey(params: AuthParams): Promise<AuthContext | null> {
  // First try Encore secrets (preferred for cloud deployment)
  const secretAuth = await validateAPIKeyFromSecrets(params);
  if (secretAuth) {
    return secretAuth;
  }

  // Fallback to database-based keys (for development/backwards compatibility)
  return await validateAPIKeyFromDB(params);
}

// Require specific permission level
export function requireAuth(requiredKind: 'write' | 'read' | 'admin', params: AuthParams): Promise<AuthContext> {
  return new Promise(async (resolve, reject) => {
    try {
      const auth = await validateAPIKey(params);
      
      if (!auth) {
        reject(APIError.unauthenticated("Valid API key required"));
        return;
      }

      // Check permission hierarchy: admin > write > read
      const permissions = { admin: 3, write: 2, read: 1 };
      if (permissions[auth.kind] < permissions[requiredKind]) {
        reject(APIError.permissionDenied(`${requiredKind} permission required`));
        return;
      }

      resolve(auth);
    } catch (error) {
      reject(APIError.internal("Authentication failed"));
    }
  });
}

// Create a new API key
export async function createAPIKey(kind: 'write' | 'read' | 'admin'): Promise<{ id: string; key: string }> {
  const key = generateAPIKey();
  const keyHash = hashAPIKey(key);

  const result = await db.queryRow<{ id: string }>`
    INSERT INTO api_keys (kind, key_hash) VALUES (${kind}, ${keyHash})
    RETURNING id
  `;

  if (!result) {
    throw new Error("Failed to create API key");
  }

  logger.info("API key created", { keyId: result.id, kind });

  return {
    id: result.id,
    key
  };
}
