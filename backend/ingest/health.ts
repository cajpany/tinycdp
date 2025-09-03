import { api } from "encore.dev/api";

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: Date;
}

// Health check endpoint for the ingest service.
export const health = api<void, HealthResponse>(
  { expose: true, method: "GET", path: "/health" },
  async () => {
    return {
      status: "ok",
      service: "ingest",
      timestamp: new Date(),
    };
  }
);
