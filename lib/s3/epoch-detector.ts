/**
 * Epoch Detection Algorithm
 *
 * Automatically detects the latest available snapshot epoch in the S3 bucket.
 * Uses S3 ListBucket API to find all available epochs.
 *
 * File naming: mn-epoch-{N}-snapshot.json
 */

/**
 * S3 bucket URL for snapshots
 */
const S3_BUCKET_URL =
  process.env.NEXT_PUBLIC_S3_BUCKET_URL ||
  "https://doublezero-contributor-rewards-mn-beta-snapshots.s3.amazonaws.com";

/**
 * Parse epoch number from snapshot filename
 *
 * @param filename - Filename like "mn-epoch-63-snapshot.json"
 * @returns Epoch number, or null if invalid format
 */
export function parseEpochFromFilename(filename: string): number | null {
  const match = filename.match(/^mn-epoch-(\d+)-snapshot\.json$/);

  if (!match) return null;

  return parseInt(match[1], 10);
}

/**
 * List all available snapshot epochs from S3 bucket
 *
 * Uses S3 ListBucket API (list-type=2) to get all files.
 *
 * @returns Array of epoch numbers sorted descending (latest first)
 */
export async function listAvailableEpochs(): Promise<number[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${S3_BUCKET_URL}/?list-type=2`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to list epochs: ${response.status}`);
    }

    const xml = await response.text();

    // Parse XML to extract <Key> elements
    const keyMatches = xml.matchAll(/<Key>([^<]+)<\/Key>/g);
    const epochs: number[] = [];

    for (const match of keyMatches) {
      const filename = match[1];
      const epoch = parseEpochFromFilename(filename);
      if (epoch !== null) {
        epochs.push(epoch);
      }
    }

    // Sort descending (latest first)
    epochs.sort((a, b) => b - a);

    return epochs;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Timeout listing epochs");
    }
    throw error;
  }
}

/**
 * Detect the latest available snapshot epoch in the S3 bucket
 *
 * Uses S3 ListBucket API to find all epochs, then returns the highest.
 *
 * @returns Latest available epoch number, or null if none found
 */
export async function detectLatestEpoch(): Promise<number | null> {
  const epochs = await listAvailableEpochs();

  if (epochs.length === 0) {
    return null;
  }

  return epochs[0]; // Already sorted descending
}

/**
 * Detect latest epoch with progress callback
 *
 * Note: With ListBucket API, progress is instant (single request).
 * The callback is called once with 100% progress.
 *
 * @param onProgress - Callback for progress updates
 * @returns Latest available epoch number, or null if none found
 */
export async function detectLatestEpochWithProgress(
  onProgress?: (currentEpoch: number, maxEpoch: number) => void
): Promise<number | null> {
  const epochs = await listAvailableEpochs();

  if (epochs.length === 0) {
    return null;
  }

  const latest = epochs[0];

  // Call progress callback with final result
  if (onProgress) {
    onProgress(latest, latest);
  }

  return latest;
}

/**
 * Check if a specific snapshot epoch exists
 *
 * @param epoch - Epoch number to check
 * @returns true if epoch exists, false otherwise
 */
export async function isEpochAvailable(epoch: number): Promise<boolean> {
  const epochs = await listAvailableEpochs();
  return epochs.includes(epoch);
}

/**
 * Get a list of available epochs in a given range
 *
 * @param startEpoch - Start of range (inclusive)
 * @param endEpoch - End of range (inclusive)
 * @returns Array of available epoch numbers (sorted ascending)
 */
export async function getAvailableEpochs(
  startEpoch: number,
  endEpoch: number
): Promise<number[]> {
  const allEpochs = await listAvailableEpochs();

  const start = Math.min(startEpoch, endEpoch);
  const end = Math.max(startEpoch, endEpoch);

  // Filter to range and sort ascending
  return allEpochs
    .filter((epoch) => epoch >= start && epoch <= end)
    .sort((a, b) => a - b);
}
