import { api } from "encore.dev/api";
import { db } from "./db";

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: Date;
  database: string;
}

// Health check endpoint for the identity service.
export const health = api<void, HealthResponse>(
  { expose: true, method: "GET", path: "/health" },
  async () => {
    try {
      // Test database connection
      await db.queryRow`SELECT 1 as test`;
      
      return {
        status: "ok",
        service: "identity",
        timestamp: new Date(),
        database: "connected"
      };
    } catch (error) {
      return {
        status: "error",
        service: "identity",
        timestamp: new Date(),
        database: "disconnected"
      };
    }
  }
);
