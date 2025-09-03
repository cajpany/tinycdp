import { api } from "encore.dev/api";
import { db } from "./db";
import { exportBucket } from "../shared/storage";
import { createLogger } from "../shared/logger";

const logger = createLogger("export");

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: Date;
  database: string;
  storage: string;
  checks: {
    database: {
      status: string;
      latency?: number;
      error?: string;
    };
    storage: {
      status: string;
      latency?: number;
      error?: string;
    };
  };
}

// Health check endpoint for the export service.
export const health = api<void, HealthResponse>(
  { expose: true, method: "GET", path: "/export/health" },
  async () => {
    logger.info("Health check started");
    const startTime = Date.now();
    
    const checks = {
      database: {
        status: "unknown" as string,
        latency: undefined as number | undefined,
        error: undefined as string | undefined,
      },
      storage: {
        status: "unknown" as string,
        latency: undefined as number | undefined,
        error: undefined as string | undefined,
      }
    };

    let dbStatus = "disconnected";
    let storageStatus = "disconnected";

    // Test database connection
    try {
      const dbStart = Date.now();
      logger.debug("Testing database connection");
      
      const result = await db.queryRow`SELECT 1 as test, NOW() as server_time`;
      const dbLatency = Date.now() - dbStart;
      
      if (!result) {
        throw new Error("Database query returned null result");
      }

      checks.database.status = "ok";
      checks.database.latency = dbLatency;
      dbStatus = "connected";
      
      logger.info("Database connection successful", { 
        latency: dbLatency,
        serverTime: result.server_time 
      });
    } catch (error) {
      const dbLatency = Date.now() - startTime;
      checks.database.status = "error";
      checks.database.latency = dbLatency;
      checks.database.error = error instanceof Error ? error.message : "Unknown database error";

      logger.error("Database health check failed", error instanceof Error ? error : new Error(String(error)), {
        latency: dbLatency
      });
    }

    // Test storage connection
    try {
      const storageStart = Date.now();
      logger.debug("Testing storage connection");
      
      // Test storage by checking if we can list objects (even if empty)
      const testKey = `health-check-${Date.now()}`;
      await exportBucket.upload(testKey, Buffer.from("test"), {
        contentType: "text/plain"
      });
      
      const exists = await exportBucket.exists(testKey);
      if (exists) {
        await exportBucket.remove(testKey);
      }
      
      const storageLatency = Date.now() - storageStart;
      checks.storage.status = "ok";
      checks.storage.latency = storageLatency;
      storageStatus = "connected";
      
      logger.info("Storage connection successful", { 
        latency: storageLatency 
      });
    } catch (error) {
      const storageLatency = Date.now() - startTime;
      checks.storage.status = "error";
      checks.storage.latency = storageLatency;
      checks.storage.error = error instanceof Error ? error.message : "Unknown storage error";

      logger.error("Storage health check failed", error instanceof Error ? error : new Error(String(error)), {
        latency: storageLatency
      });
    }

    const overallStatus = (checks.database.status === "ok" && checks.storage.status === "ok") ? "ok" : "error";

    const response = {
      status: overallStatus,
      service: "export",
      timestamp: new Date(),
      database: dbStatus,
      storage: storageStatus,
      checks
    };

    logger.info("Health check completed", { 
      status: overallStatus,
      totalLatency: Date.now() - startTime 
    });

    return response;
  }
);
