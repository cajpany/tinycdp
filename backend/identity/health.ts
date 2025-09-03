import { api } from "encore.dev/api";

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: Date;
}

// Health check endpoint for the identity service.
export const health = api<void, HealthResponse>(
  { expose: true, method: "GET", path: "/health" },
  async () => {
    return {
      status: "ok",
      service: "identity",
      timestamp: new Date(),
    };
  }
);
