import { SQLDatabase } from "encore.dev/storage/sqldb";
import { createLogger } from "./logger";

const logger = createLogger("shared-db");

// Create the main database instance
export const db = new SQLDatabase("tinycdp", {
  migrations: "./migrations",
});

// Add connection monitoring
process.on('uncaughtException', (error) => {
  logger.error("Uncaught exception in database module", error, {
    pid: process.pid,
    memory: process.memoryUsage()
  });
  // Don't exit - let Encore handle this
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error("Unhandled rejection in database module", reason instanceof Error ? reason : new Error(String(reason)), {
    promise: promise.toString(),
    pid: process.pid,
    memory: process.memoryUsage()
  });
});

// Log database initialization
logger.info("Database instance created", {
  connectionString: db.connectionString ? "configured" : "not configured"
});
