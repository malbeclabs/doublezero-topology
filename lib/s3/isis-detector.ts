/**
 * ISIS Database S3 Detector
 *
 * Detects and fetches ISIS database files from public S3 bucket.
 * No AWS SDK or credentials required - uses direct HTTPS fetch.
 *
 * File Format: YYYY-MM-DDTHH-MM-SSZ_upload_data.json
 * Example: 2025-11-20T15-42-04Z_upload_data.json
 *
 * Upload Schedule: Every 6 hours at 03:42, 09:42, 15:42, 21:42 UTC
 */

/**
 * Known upload times for ISIS database (UTC)
 * Files are uploaded every 6 hours at these minute marks
 */
const UPLOAD_TIMES = [
  { hour: 3, minute: 42, second: 4 },
  { hour: 9, minute: 42, second: 4 },
  { hour: 15, minute: 42, second: 4 },
  { hour: 21, minute: 42, second: 4 },
] as const;

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

  return new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
  );
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
  const bucketUrl =
    process.env.NEXT_PUBLIC_S3_ISIS_BUCKET_URL ||
    "https://doublezero-mn-beta-isis-db.s3.us-east-1.amazonaws.com";

  return `${bucketUrl}/${filename}`;
}

/**
 * Check if file exists using HEAD request
 *
 * @param url - URL to check
 * @returns true if file exists, false otherwise
 */
async function checkFileExists(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

/**
 * Detect latest ISIS file by checking recent timestamps
 *
 * Strategy:
 * 1. Start from current date
 * 2. Check known upload times (03:42, 09:42, 15:42, 21:42 UTC) in reverse
 * 3. Go back 30 days checking all 4 daily uploads (120 total checks)
 * 4. Return first found file
 *
 * @returns Detection result with timestamp and URL, or null if not found
 */
export async function detectLatestIsis(): Promise<IsisDetectionResult | null> {
  const now = new Date();

  // Start from today and go back 30 days
  for (let daysBack = 0; daysBack < 30; daysBack++) {
    const checkDate = new Date(now);
    checkDate.setUTCDate(checkDate.getUTCDate() - daysBack);

    // Check each upload time in reverse order (latest first)
    for (let i = UPLOAD_TIMES.length - 1; i >= 0; i--) {
      const { hour, minute, second } = UPLOAD_TIMES[i];

      const checkTime = new Date(
        Date.UTC(
          checkDate.getUTCFullYear(),
          checkDate.getUTCMonth(),
          checkDate.getUTCDate(),
          hour,
          minute,
          second
        )
      );

      // Skip future timestamps
      if (checkTime > now) continue;

      const url = buildIsisUrl(checkTime);

      try {
        const exists = await checkFileExists(url);
        if (exists) {
          return { timestamp: checkTime, url };
        }
      } catch {
        // Continue to next time slot
      }
    }
  }

  return null;
}

/**
 * Detect latest ISIS file for a specific date
 *
 * Strategy:
 * 1. Parse input date (YYYY-MM-DD format)
 * 2. Check known upload times in reverse order (21:42, 15:42, 09:42, 03:42)
 * 3. Return first found file for that date
 *
 * @param dateString - Date in YYYY-MM-DD format (e.g., "2025-11-20")
 * @returns Detection result with timestamp and URL, or null if not found
 * @throws Error if date format is invalid
 */
export async function detectLatestIsisForDate(
  dateString: string
): Promise<IsisDetectionResult | null> {
  // Parse date
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error("Invalid date format. Use YYYY-MM-DD (e.g., 2025-11-20)");
  }

  const [, year, month, day] = match;
  const targetDate = new Date(
    Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day))
  );

  // Check each upload time in reverse order (latest first)
  for (let i = UPLOAD_TIMES.length - 1; i >= 0; i--) {
    const { hour, minute, second } = UPLOAD_TIMES[i];

    const checkTime = new Date(
      Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate(),
        hour,
        minute,
        second
      )
    );

    const url = buildIsisUrl(checkTime);

    try {
      const exists = await checkFileExists(url);
      if (exists) {
        return { timestamp: checkTime, url };
      }
    } catch {
      // Continue to next time slot
    }
  }

  return null;
}
