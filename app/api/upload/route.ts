/**
 * Upload API Route
 *
 * Handles file uploads and processes topology data directly in memory.
 * No S3/MinIO required - files are processed immediately.
 */

import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";

// Import the existing topology processing logic
// We'll reuse the same processing code, just with in-memory files instead of S3
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  logger.info('Upload request received');

  try {
    // Parse multipart form data
    const formData = await request.formData();

    const snapshotFile = formData.get('snapshot') as File;
    const isisFile = formData.get('isis') as File;

    // Validate files exist
    if (!snapshotFile || !isisFile) {
      logger.warn('Upload validation failed: missing files');
      return Response.json(
        { success: false, error: 'Both snapshot and ISIS files are required' },
        { status: 400 }
      );
    }

    logger.info('Files received', {
      snapshot: `${snapshotFile.name} (${(snapshotFile.size / 1024 / 1024).toFixed(2)} MB)`,
      isis: `${isisFile.name} (${(isisFile.size / 1024).toFixed(2)} KB)`
    });

    // Validate file sizes
    const MAX_SNAPSHOT_SIZE = 100 * 1024 * 1024; // 100MB
    const MAX_ISIS_SIZE = 10 * 1024 * 1024; // 10MB

    if (snapshotFile.size > MAX_SNAPSHOT_SIZE) {
      logger.warn('Snapshot file too large', { size: snapshotFile.size });
      return Response.json(
        { success: false, error: 'Snapshot file must be less than 100MB' },
        { status: 400 }
      );
    }

    if (isisFile.size > MAX_ISIS_SIZE) {
      logger.warn('ISIS file too large', { size: isisFile.size });
      return Response.json(
        { success: false, error: 'ISIS file must be less than 10MB' },
        { status: 400 }
      );
    }

    // Read file contents
    logger.info('Reading file contents');
    const snapshotContent = await snapshotFile.text();
    const isisContent = await isisFile.text();

    // Validate JSON
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let snapshotData: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let isisData: any;

    try {
      logger.info('Parsing snapshot JSON');
      snapshotData = JSON.parse(snapshotContent);
    } catch (error) {
      logger.error('Snapshot JSON parse error', { error: String(error) });
      return Response.json(
        { success: false, error: 'Snapshot file contains invalid JSON' },
        { status: 400 }
      );
    }

    try {
      logger.info('Parsing ISIS JSON');
      isisData = JSON.parse(isisContent);
    } catch (error) {
      logger.error('ISIS JSON parse error', { error: String(error) });
      return Response.json(
        { success: false, error: 'ISIS file contains invalid JSON' },
        { status: 400 }
      );
    }

    // Process topology data using the same logic as GET /api/topology
    // We'll import and call the processing function
    logger.info('Starting topology processing');
    const { processTopologyData } = await import('../topology/processor');

    const result = await processTopologyData(snapshotData, isisData);

    const processingTime = Date.now() - startTime;
    logger.info('Upload processing complete', {
      totalLinks: result.summary.total_links,
      healthy: result.summary.healthy,
      driftHigh: result.summary.drift_high,
      missingIsis: result.summary.missing_isis,
      missingTelemetry: result.summary.missing_telemetry,
      processingTimeMs: processingTime
    });

    return Response.json({
      success: true,
      data: result
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Upload processing failed', {
      error: error instanceof Error ? error.message : String(error),
      processingTimeMs: processingTime
    });
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
