import { Bucket } from "encore.dev/storage/objects";
import { createLogger } from "./logger";

const logger = createLogger("shared-storage");

export const exportBucket = new Bucket("tinycdp-exports", {
  public: true,
});

// Add storage monitoring
process.on('uncaughtException', (error) => {
  logger.error("Uncaught exception in storage module", error, {
    pid: process.pid,
    memory: process.memoryUsage()
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error("Unhandled rejection in storage module", reason instanceof Error ? reason : new Error(String(reason)), {
    promise: promise.toString(),
    pid: process.pid,
    memory: process.memoryUsage()
  });
});

// Log storage initialization
logger.info("Storage bucket created", {
  bucketName: "tinycdp-exports"
});
