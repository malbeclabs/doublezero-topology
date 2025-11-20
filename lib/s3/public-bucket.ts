/**
 * Public S3 Bucket Client
 *
 * Provides access to public S3 buckets using direct HTTPS URLs.
 * No AWS SDK or credentials required.
 *
 * Used for fetching network topology snapshots from the public
 * DoubleZero contributor rewards bucket.
 */

/**
 * File types available in the S3 bucket
 */
export type FileType = "snapshot" | "isis-db";

/**
 * Download progress information
 */
export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  estimatedTimeRemaining?: number;
}

/**
 * Result of fetching data from S3
 */
export interface EpochFetchResult {
  success: boolean;
  epoch: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any | null;
  error?: string;
  source: "cache" | "s3";
  timestamp: number;
  size?: number;
}

/**
 * Error types for S3 operations
 */
export enum S3ErrorType {
  NETWORK_ERROR = "network_error",
  TIMEOUT = "timeout",
  NOT_FOUND = "not_found",
  INVALID_JSON = "invalid_json",
  STORAGE_FULL = "storage_full",
  CORS_ERROR = "cors_error",
  UNKNOWN = "unknown",
}

/**
 * Structured error information
 */
export interface S3Error {
  type: S3ErrorType;
  message: string;
  suggestion: string;
}

/**
 * Public S3 bucket configuration
 */
const S3_BUCKET_URL =
  process.env.NEXT_PUBLIC_S3_BUCKET_URL ||
  "https://doublezero-contributor-rewards-mn-beta-snapshots.s3.amazonaws.com";

/**
 * Default timeout for fetch requests (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Build S3 URL for a specific epoch and file type
 *
 * @param epoch - Epoch number (e.g., 34)
 * @param fileType - Type of file to fetch
 * @returns Full HTTPS URL to the S3 object
 */
export function buildS3Url(epoch: number, fileType: FileType = "snapshot"): string {
  const filename =
    fileType === "snapshot"
      ? `mn-epoch-${epoch}-snapshot.json`
      : `mn-epoch-${epoch}-isis-db.json`;

  return `${S3_BUCKET_URL}/${filename}`;
}

/**
 * Check if a file exists in S3 using HEAD request
 *
 * @param epoch - Epoch number to check
 * @param fileType - Type of file to check
 * @returns true if file exists, false otherwise
 */
export async function checkEpochExists(
  epoch: number,
  fileType: FileType = "snapshot"
): Promise<boolean> {
  const url = buildS3Url(epoch, fileType);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for HEAD

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
 * Download file with progress tracking
 *
 * @param url - URL to download from
 * @param onProgress - Optional callback for progress updates
 * @param signal - Optional AbortSignal for cancellation
 * @returns Downloaded content as ArrayBuffer
 */
async function downloadWithProgress(
  url: string,
  onProgress?: (progress: DownloadProgress) => void,
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  // Combine user signal with timeout signal
  const combinedSignal = signal || controller.signal;

  try {
    const response = await fetch(url, { signal: combinedSignal });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("NOT_FOUND");
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get("content-length");
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytesDownloaded = 0;
    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      bytesDownloaded += value.length;

      // Calculate progress
      if (onProgress && totalBytes > 0) {
        const percentage = (bytesDownloaded / totalBytes) * 100;
        const elapsed = Date.now() - startTime;
        const rate = bytesDownloaded / (elapsed / 1000); // bytes per second
        const remaining = totalBytes - bytesDownloaded;
        const estimatedTimeRemaining = remaining / rate;

        onProgress({
          bytesDownloaded,
          totalBytes,
          percentage,
          estimatedTimeRemaining,
        });
      }
    }

    clearTimeout(timeoutId);

    // Combine chunks into single ArrayBuffer
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result.buffer;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof Error) {
      if (err.name === "AbortError") {
        throw new Error("TIMEOUT");
      }
      if (err.message === "NOT_FOUND") {
        throw err;
      }
      // Check for CORS errors (browser blocks the request)
      if (err.message.includes("CORS") || err.message.includes("Cross-Origin")) {
        throw new Error("CORS_ERROR");
      }
    }

    // TypeError often indicates CORS blocking in browsers
    if (err instanceof TypeError) {
      throw new Error("CORS_ERROR");
    }

    throw new Error("NETWORK_ERROR");
  }
}

/**
 * Fetch snapshot from S3 for a specific epoch
 *
 * @param epoch - Epoch number to fetch
 * @param fileType - Type of file to fetch
 * @param onProgress - Optional callback for progress updates
 * @param signal - Optional AbortSignal for cancellation
 * @returns Fetch result with data and metadata
 */
export async function fetchFileFromS3(
  epoch: number,
  fileType: FileType = "snapshot",
  onProgress?: (progress: DownloadProgress) => void,
  signal?: AbortSignal
): Promise<EpochFetchResult> {
  const url = buildS3Url(epoch, fileType);

  try {
    // Download file with progress tracking
    const arrayBuffer = await downloadWithProgress(url, onProgress, signal);

    // Convert to string and parse JSON
    const decoder = new TextDecoder("utf-8");
    const jsonString = decoder.decode(arrayBuffer);

    let parsedData;
    try {
      parsedData = JSON.parse(jsonString);
    } catch {
      return {
        success: false,
        epoch,
        data: null,
        error: "INVALID_JSON",
        source: "s3",
        timestamp: Date.now(),
      };
    }

    return {
      success: true,
      epoch,
      data: parsedData,
      source: "s3",
      timestamp: Date.now(),
      size: arrayBuffer.byteLength,
    };
  } catch (error) {
    let errorType = "UNKNOWN";
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        errorType = "NOT_FOUND";
      } else if (error.message === "TIMEOUT") {
        errorType = "TIMEOUT";
      } else if (error.message === "CORS_ERROR") {
        errorType = "CORS_ERROR";
      } else if (error.message === "NETWORK_ERROR") {
        errorType = "NETWORK_ERROR";
      }
    }

    return {
      success: false,
      epoch,
      data: null,
      error: errorType,
      source: "s3",
      timestamp: Date.now(),
    };
  }
}

/**
 * Fetch file from S3 using direct URL
 *
 * This is useful for ISIS database files where the URL is determined
 * by timestamp detection rather than epoch number.
 *
 * @param url - Full HTTPS URL to the S3 file
 * @param onProgress - Optional callback for progress updates
 * @param signal - Optional AbortSignal for cancellation
 * @returns Fetch result with data and metadata
 */
export async function fetchFileFromUrl(
  url: string,
  onProgress?: (progress: DownloadProgress) => void,
  signal?: AbortSignal
): Promise<EpochFetchResult> {
  try {
    // Download file with progress tracking
    const arrayBuffer = await downloadWithProgress(url, onProgress, signal);

    // Convert to string and parse JSON
    const decoder = new TextDecoder("utf-8");
    const jsonString = decoder.decode(arrayBuffer);

    let parsedData;
    try {
      parsedData = JSON.parse(jsonString);
    } catch {
      return {
        success: false,
        epoch: null,
        data: null,
        error: "INVALID_JSON",
        source: "s3",
        timestamp: Date.now(),
      };
    }

    return {
      success: true,
      epoch: null,
      data: parsedData,
      source: "s3",
      timestamp: Date.now(),
      size: arrayBuffer.byteLength,
    };
  } catch (error) {
    let errorType = "UNKNOWN";
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        errorType = "NOT_FOUND";
      } else if (error.message === "TIMEOUT") {
        errorType = "TIMEOUT";
      } else if (error.message === "CORS_ERROR") {
        errorType = "CORS_ERROR";
      } else if (error.message === "NETWORK_ERROR") {
        errorType = "NETWORK_ERROR";
      }
    }

    return {
      success: false,
      epoch: null,
      data: null,
      error: errorType,
      source: "s3",
      timestamp: Date.now(),
    };
  }
}

/**
 * Create user-friendly error information from error type
 *
 * @param errorType - Type of error that occurred
 * @param epoch - Epoch number that was attempted
 * @returns Structured error with message and suggestion
 */
export function createS3Error(errorType: string, epoch?: number): S3Error {
  switch (errorType) {
    case "NOT_FOUND":
      return {
        type: S3ErrorType.NOT_FOUND,
        message: epoch
          ? `Epoch ${epoch} not found in S3 bucket.`
          : "File not found in S3 bucket.",
        suggestion: "Try a different epoch number or upload files manually.",
      };

    case "TIMEOUT":
      return {
        type: S3ErrorType.TIMEOUT,
        message: "Download timed out after 30 seconds.",
        suggestion:
          "Check your internet connection and try again, or upload files manually.",
      };

    case "NETWORK_ERROR":
      return {
        type: S3ErrorType.NETWORK_ERROR,
        message: "Network error occurred while downloading from S3.",
        suggestion:
          "Check your internet connection and try again, or upload files manually.",
      };

    case "INVALID_JSON":
      return {
        type: S3ErrorType.INVALID_JSON,
        message: "Downloaded file contains invalid JSON.",
        suggestion: "Try a different epoch or upload a valid file manually.",
      };

    case "STORAGE_FULL":
      return {
        type: S3ErrorType.STORAGE_FULL,
        message: "Browser storage is full.",
        suggestion:
          "Clear your browser cache or use incognito mode, then try again.",
      };

    case "CORS_ERROR":
      return {
        type: S3ErrorType.CORS_ERROR,
        message: "S3 bucket CORS configuration is missing or incorrect.",
        suggestion:
          "The S3 bucket needs CORS configuration. See S3-CORS-SETUP.md for instructions, or use manual upload instead.",
      };

    default:
      return {
        type: S3ErrorType.UNKNOWN,
        message: "An unknown error occurred.",
        suggestion: "Please try again or upload files manually.",
      };
  }
}
