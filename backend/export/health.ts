import { api } from "encore.dev/api";
import { db } from "./db";

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: Date;
  database: string;
}

// Health check endpoint for the export service.
export const health = api<void, HealthResponse>(
  { expose: true, method: "GET", path: "/health" },
  async () => {
    try {
      // Test database connection
      await db.queryRow`SELECT 1 as test`;
      
      return {
        status: "ok",
        service: "export",
        timestamp: new Date(),
        database: "connected"
      };
    } catch (error) {
      return {
        status: "error",
        service: "export",
        timestamp: new Date(),
        database: "disconnected"
      };
    }
  }
);
