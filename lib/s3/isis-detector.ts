/**
 * ISIS Database S3 Detector
 *
 * Detects and fetches ISIS database files from public S3 bucket.
 * Uses S3 ListBucket API to find files, no AWS SDK required.
 *
 * File Format: YYYY-MM-DDTHH-MM-SSZ_upload_data.json
 * Example: 2025-11-20T15-42-04Z_upload_data.json
 *
 * Upload Schedule: Every 6 hours at 03:42, 09:42, 15:42, 21:42 UTC
 */

/**
 * S3 bucket URL for ISIS database files
 */
const ISIS_BUCKET_URL =
  process.env.NEXT_PUBLIC_S3_ISIS_BUCKET_URL ||
  "https://doublezero-mn-beta-isis-db.s3.us-east-1.amazonaws.com";

/**
 * Result of ISIS file detection
 */
export interface IsisDetectionResult {
  timestamp: Date;
  url: string;
}

/**
 * Parse timestamp from ISIS filename
 *
 * Format: YYYY-MM-DDTHH-MM-SSZ_upload_data.json
 * Example: 2025-11-20T15-42-04Z_upload_data.json
 *
 * @param filename - ISIS filename to parse
 * @returns Parsed Date object, or null if invalid format
 */
export function parseIsisTimestamp(filename: string): Date | null {
  const match = filename.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})Z_upload_data\.json$/
  );

  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;

  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
}

/**
 * Build ISIS bucket URL for a specific filename
 *
 * @param filename - Filename to build URL for
 * @returns Full HTTPS URL to ISIS file
 */
export function buildIsisUrlFromFilename(filename: string): string {
  return `${ISIS_BUCKET_URL}/${filename}`;
}

/**
 * Build ISIS bucket URL for a specific timestamp
 *
 * @param timestamp - Timestamp to build URL for
 * @returns Full HTTPS URL to ISIS file
 */
export function buildIsisUrl(timestamp: Date): string {
  const year = timestamp.getUTCFullYear();
  const month = String(timestamp.getUTCMonth() + 1).padStart(2, "0");
  const day = String(timestamp.getUTCDate()).padStart(2, "0");
  const hour = String(timestamp.getUTCHours()).padStart(2, "0");
  const minute = String(timestamp.getUTCMinutes()).padStart(2, "0");
  const second = String(timestamp.getUTCSeconds()).padStart(2, "0");

  const filename = `${year}-${month}-${day}T${hour}-${minute}-${second}Z_upload_data.json`;
  return buildIsisUrlFromFilename(filename);
}

/**
 * List all ISIS files in the S3 bucket
 *
 * Uses S3 ListBucket API (list-type=2) to get all files.
 *
 * @returns Array of filenames sorted by timestamp (latest first)
 */
export async function listIsisFiles(): Promise<string[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${ISIS_BUCKET_URL}/?list-type=2`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to list ISIS files: ${response.status}`);
    }

    const xml = await response.text();

    // Parse XML to extract <Key> elements
    const keyMatches = xml.matchAll(/<Key>([^<]+)<\/Key>/g);
    const files: string[] = [];

    for (const match of keyMatches) {
      const filename = match[1];
      // Only include valid ISIS upload files
      if (parseIsisTimestamp(filename)) {
        files.push(filename);
      }
    }

    // Sort by filename descending (ISO-8601 format sorts lexicographically)
    files.sort((a, b) => b.localeCompare(a));

    return files;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Timeout listing ISIS files");
    }
    throw error;
  }
}

/**
 * Detect latest ISIS file using S3 ListBucket API
 *
 * Strategy:
 * 1. List all files in the bucket
 * 2. Sort by filename (ISO-8601 format sorts correctly)
 * 3. Return the latest file
 *
 * @returns Detection result with timestamp and URL, or null if not found
 */
export async function detectLatestIsis(): Promise<IsisDetectionResult | null> {
  const files = await listIsisFiles();

  if (files.length === 0) {
    return null;
  }

  const latestFile = files[0]; // Already sorted descending
  const timestamp = parseIsisTimestamp(latestFile);

  if (!timestamp) {
    return null;
  }

  return {
    timestamp,
    url: buildIsisUrlFromFilename(latestFile),
  };
}

/**
 * Detect latest ISIS file for a specific date
 *
 * Strategy:
 * 1. List all files in the bucket
 * 2. Filter to files matching the target date
 * 3. Return the latest file for that date
 *
 * @param dateString - Date in YYYY-MM-DD format (e.g., "2025-11-20")
 * @returns Detection result with timestamp and URL, or null if not found
 * @throws Error if date format is invalid
 */
export async function detectLatestIsisForDate(
  dateString: string
): Promise<IsisDetectionResult | null> {
  // Validate date format
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error("Invalid date format. Use YYYY-MM-DD (e.g., 2025-11-20)");
  }

  const files = await listIsisFiles();

  // Filter to files matching the target date prefix
  const datePrefix = `${dateString}T`;
  const matchingFiles = files.filter((f) => f.startsWith(datePrefix));

  if (matchingFiles.length === 0) {
    return null;
  }

  const latestFile = matchingFiles[0]; // Already sorted descending
  const timestamp = parseIsisTimestamp(latestFile);

  if (!timestamp) {
    return null;
  }

  return {
    timestamp,
    url: buildIsisUrlFromFilename(latestFile),
  };
}
