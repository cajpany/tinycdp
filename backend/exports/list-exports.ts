import { api } from "encore.dev/api";
import { exportBucket } from "../shared/storage";
import { createLogger } from "../shared/logger";
import { ServiceError, handleServiceError } from "../shared/errors";
import { requireAuth, type AuthParams } from "../shared/auth";

const logger = createLogger("export");

export interface ExportFile {
  name: string;
  size: number;
  etag: string;
  downloadUrl?: string;
}

export interface ListExportsResponse {
  exports: ExportFile[];
}

// Lists all available export files.
export const listExports = api<AuthParams, ListExportsResponse>(
  { expose: true, method: "GET", path: "/v1/export/list" },
  async (params) => {
    try {
      await requireAuth('read', params);

      logger.info("Listing export files");

      const exports: ExportFile[] = [];

      // List all files in the bucket
      for await (const entry of exportBucket.list()) {
        try {
          // Generate a signed download URL for each file (valid for 1 hour)
          const { url: downloadUrl } = await exportBucket.signedDownloadUrl(entry.name, {
            ttl: 3600 // 1 hour
          });

          exports.push({
            name: entry.name,
            size: entry.size,
            etag: entry.etag,
            downloadUrl
          });
        } catch (error) {
          logger.warn("Failed to generate download URL for export file", {
            filename: entry.name,
            error: error instanceof Error ? error.message : String(error)
          });

          // Add file without download URL
          exports.push({
            name: entry.name,
            size: entry.size,
            etag: entry.etag
          });
        }
      }

      // Sort by filename (most recent first based on date in filename)
      exports.sort((a, b) => b.name.localeCompare(a.name));

      logger.info("Retrieved export files", { 
        count: exports.length 
      });

      return { exports };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "listExports"
      });
    }
  }
);
