import { api } from "encore.dev/api";
import { db } from "./db";
import { exportBucket } from "../shared/storage";
import { createLogger } from "../shared/logger";
import { ServiceError, handleServiceError } from "../shared/errors";
import { requireAuth, type AuthParams } from "../shared/auth";

const logger = createLogger("export");

export interface ExportSegmentParams extends AuthParams {
  key: string;
}

export interface ExportSegmentResponse {
  downloadUrl: string;
  filename: string;
  userCount: number;
}

// Exports a segment to CSV format.
export const exportSegment = api<ExportSegmentParams, ExportSegmentResponse>(
  { expose: true, method: "GET", path: "/v1/export/segment/:key" },
  async (params) => {
    try {
      await requireAuth('read', params.authorization);

      logger.info("Exporting segment to CSV", { segmentKey: params.key });

      // Validate segment exists
      const segment = await db.queryRow<{ key: string; rule: string }>`
        SELECT key, rule FROM segment_defs WHERE key = ${params.key}
      `;

      if (!segment) {
        throw new ServiceError("SEGMENT_NOT_FOUND", "Segment not found", 404);
      }

      // Get all users in this segment
      const users = await db.queryAll<{
        user_id: string;
        created_at: Date;
        in_segment: boolean;
        since: Date | null;
        updated_at: Date;
        aliases: string;
      }>`
        SELECT 
          u.id as user_id,
          u.created_at,
          COALESCE(us.in_segment, false) as in_segment,
          us.since,
          us.updated_at,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object('kind', ua.kind, 'value', ua.value)
              )
              FROM user_aliases ua 
              WHERE ua.user_id = u.id
            ),
            '[]'::json
          ) as aliases
        FROM users u
        LEFT JOIN user_segments us ON u.id = us.user_id AND us.key = ${params.key}
        WHERE COALESCE(us.in_segment, false) = true
        ORDER BY u.created_at DESC
      `;

      logger.info("Retrieved segment users", {
        segmentKey: params.key,
        userCount: users.length
      });

      // Generate CSV content
      const csvRows = [
        // Header row
        'user_id,created_at,in_segment,since,updated_at,device_id,external_id,email_hash'
      ];

      for (const user of users) {
        const aliases = JSON.parse(user.aliases as string) as Array<{kind: string, value: string}>;
        const deviceId = aliases.find(a => a.kind === 'deviceId')?.value || '';
        const externalId = aliases.find(a => a.kind === 'externalId')?.value || '';
        const emailHash = aliases.find(a => a.kind === 'emailHash')?.value || '';

        csvRows.push([
          user.user_id,
          user.created_at.toISOString(),
          user.in_segment.toString(),
          user.since?.toISOString() || '',
          user.updated_at?.toISOString() || '',
          deviceId,
          externalId,
          emailHash
        ].map(field => `"${field.replace(/"/g, '""')}"`).join(','));
      }

      const csvContent = csvRows.join('\n');
      const filename = `segment_${params.key}_${new Date().toISOString().split('T')[0]}.csv`;

      // Upload to storage
      await exportBucket.upload(filename, Buffer.from(csvContent, 'utf-8'), {
        contentType: 'text/csv'
      });

      // Generate signed download URL (valid for 1 hour)
      const { url: downloadUrl } = await exportBucket.signedDownloadUrl(filename, {
        ttl: 3600 // 1 hour
      });

      logger.info("Successfully exported segment to CSV", {
        segmentKey: params.key,
        filename,
        userCount: users.length,
        csvSize: csvContent.length
      });

      return {
        downloadUrl,
        filename,
        userCount: users.length
      };

    } catch (error) {
      handleServiceError(error, logger, {
        endpoint: "exportSegment",
        segmentKey: params.key
      });
    }
  }
);
