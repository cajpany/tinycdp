import { api } from "encore.dev/api";

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: Date;
}

// Health check endpoint for the export service.
export const health = api<void, HealthResponse>(
  { expose: true, method: "GET", path: "/health" },
  async () => {
    return {
      status: "ok",
      service: "export",
      timestamp: new Date(),
    };
  }
);
