/**
 * Topology API Route
 *
 * GET /api/topology - Process local sample data files
 *
 * Note: File upload functionality is at POST /api/upload
 */

import { processTopologyData } from "./processor";
import { logger } from "@/lib/logger";

/**
 * GET /api/topology
 *
 * Process topology data from local sample files
 */
export async function GET(): Promise<Response> {
  const startTime = Date.now();
  logger.info('Topology request received (local sample data)');

  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Load local data files
    const snapshotPath = path.join(process.cwd(), 'data', 'mn-epoch-34-snapshot.json');
    const isisPath = path.join(process.cwd(), 'data', 'isis-db.json');

    logger.info('Reading local sample files');
    const snapshotContent = await fs.readFile(snapshotPath, 'utf-8');
    const isisContent = await fs.readFile(isisPath, 'utf-8');

    // Parse JSON
    logger.info('Parsing JSON files');
    const snapshotData = JSON.parse(snapshotContent);
    const isisData = JSON.parse(isisContent);

    // Process using shared processor
    logger.info('Processing topology data');
    const result = await processTopologyData(snapshotData, isisData);

    const processingTime = Date.now() - startTime;
    logger.info('Topology processing complete', {
      totalLinks: result.summary.total_links,
      healthy: result.summary.healthy,
      driftHigh: result.summary.drift_high,
      missingIsis: result.summary.missing_isis,
      missingTelemetry: result.summary.missing_telemetry,
      processingTimeMs: processingTime
    });

    return Response.json({ success: true, data: result });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Topology processing failed', {
      error: error instanceof Error ? error.message : String(error),
      processingTimeMs: processingTime
    });
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
