import { api } from "encore.dev/api";
import { db } from "./db";
import { createLogger } from "../shared/logger";
import { handleServiceError } from "../shared/errors";

const logger = createLogger("ingest");

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: Date;
  database: string;
  checks: {
    database: {
      status: string;
      latency?: number;
      error?: string;
    };
  };
}

// Health check endpoint for the ingest service.
export const health = api<void, HealthResponse>(
  { expose: true, method: "GET", path: "/health" },
  async () => {
    logger.info("Health check started");
    const startTime = Date.now();
    
    const checks = {
      database: {
        status: "unknown" as string,
        latency: undefined as number | undefined,
        error: undefined as string | undefined,
      }
    };

    try {
      // Test database connection with detailed timing
      const dbStart = Date.now();
      logger.debug("Testing database connection");
      
      const result = await db.queryRow`SELECT 1 as test, NOW() as server_time`;
      const dbLatency = Date.now() - dbStart;
      
      if (!result) {
        throw new Error("Database query returned null result");
      }

      checks.database.status = "ok";
      checks.database.latency = dbLatency;
      
      logger.info("Database connection successful", { 
        latency: dbLatency,
        serverTime: result.server_time 
      });

      const response = {
        status: "ok",
        service: "ingest",
        timestamp: new Date(),
        database: "connected",
        checks
      };

      logger.info("Health check completed successfully", { 
        totalLatency: Date.now() - startTime 
      });

      return response;
    } catch (error) {
      const dbLatency = Date.now() - startTime;
      checks.database.status = "error";
      checks.database.latency = dbLatency;
      checks.database.error = error instanceof Error ? error.message : "Unknown database error";

      logger.error("Health check failed", error instanceof Error ? error : new Error(String(error)), {
        latency: dbLatency
      });

      return {
        status: "error",
        service: "ingest",
        timestamp: new Date(),
        database: "disconnected",
        checks
      };
    }
  }
);
