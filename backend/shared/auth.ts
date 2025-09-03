import { Header, APIError } from "encore.dev/api";
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

// Validate API key and return auth context
export async function validateAPIKey(authHeader?: string): Promise<AuthContext | null> {
  if (!authHeader) {
    return null;
  }

  // Extract key from "Bearer <key>" format
  const matches = authHeader.match(/^Bearer\s+(.+)$/);
  if (!matches) {
    logger.warn("Invalid authorization header format");
    return null;
  }

  const key = matches[1];
  const keyHash = hashAPIKey(key);

  try {
    const apiKey = await db.queryRow<{ id: string; kind: 'write' | 'read' | 'admin' }>`
      SELECT id, kind FROM api_keys WHERE key_hash = ${keyHash}
    `;

    if (!apiKey) {
      logger.warn("Invalid API key", { keyHash: keyHash.substring(0, 8) + "..." });
      return null;
    }

    logger.debug("API key validated", { keyId: apiKey.id, kind: apiKey.kind });
    return {
      keyId: apiKey.id,
      kind: apiKey.kind
    };
  } catch (error) {
    logger.error("Failed to validate API key", error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

// Require specific permission level
export function requireAuth(requiredKind: 'write' | 'read' | 'admin', authHeader?: string): Promise<AuthContext> {
  return new Promise(async (resolve, reject) => {
    try {
      const auth = await validateAPIKey(authHeader);
      
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
