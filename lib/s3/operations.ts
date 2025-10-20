/**
 * S3 Operations
 *
 * High-level functions for interacting with S3/MinIO:
 * - Upload files (PutObject)
 * - Download files (GetObject)
 * - List files (ListObjectsV2)
 * - Delete files (DeleteObject)
 * - Generate presigned URLs (GetObjectCommand + getSignedUrl)
 */

import {
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadObjectCommand,
  type PutObjectCommandInput,
  type ListObjectsV2CommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, S3_BUCKET } from "./client";

/**
 * Upload a file to S3/MinIO
 *
 * @param key - Object key (path) in the bucket
 * @param body - File content (Buffer, Blob, ReadableStream, or string)
 * @param contentType - MIME type of the file
 * @returns Upload result with ETag
 */
export async function uploadFile(
  key: string,
  body: Buffer | Blob | ReadableStream | string,
  contentType?: string
) {
  const params: PutObjectCommandInput = {
    Bucket: S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  };

  const command = new PutObjectCommand(params);
  const result = await s3Client.send(command);

  return {
    success: true,
    key,
    etag: result.ETag,
    versionId: result.VersionId,
  };
}

/**
 * Download a file from S3/MinIO
 *
 * @param key - Object key (path) in the bucket
 * @returns File content as Buffer
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  const result = await s3Client.send(command);

  if (!result.Body) {
    throw new Error(`No body returned for key: ${key}`);
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  // AWS SDK v3 Body is an async iterable
  for await (const chunk of result.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/**
 * Download a file as a string (useful for JSON files)
 *
 * @param key - Object key (path) in the bucket
 * @returns File content as string
 */
export async function downloadFileAsString(key: string): Promise<string> {
  const buffer = await downloadFile(key);
  return buffer.toString("utf-8");
}

/**
 * Download and parse a JSON file
 *
 * @param key - Object key (path) in the bucket
 * @returns Parsed JSON object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function downloadJsonFile<T = any>(key: string): Promise<T> {
  const content = await downloadFileAsString(key);
  return JSON.parse(content);
}

/**
 * List files in a bucket or prefix
 *
 * @param prefix - Optional prefix to filter objects (e.g., "snapshots/")
 * @param maxKeys - Maximum number of keys to return (default: 1000)
 * @returns Array of object metadata
 */
export async function listFiles(prefix?: string, maxKeys: number = 1000) {
  const params: ListObjectsV2CommandInput = {
    Bucket: S3_BUCKET,
    Prefix: prefix,
    MaxKeys: maxKeys,
  };

  const command = new ListObjectsV2Command(params);
  const result = await s3Client.send(command);

  return {
    files: result.Contents || [],
    count: result.KeyCount || 0,
    isTruncated: result.IsTruncated || false,
    nextContinuationToken: result.NextContinuationToken,
  };
}

/**
 * Delete a file from S3/MinIO
 *
 * @param key - Object key (path) to delete
 * @returns Deletion result
 */
export async function deleteFile(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  const result = await s3Client.send(command);

  return {
    success: true,
    key,
    deleteMarker: result.DeleteMarker,
    versionId: result.VersionId,
  };
}

/**
 * Check if a file exists in S3/MinIO
 *
 * @param key - Object key (path) to check
 * @returns true if file exists, false otherwise
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (error) {
    // AWS SDK errors have name and $metadata properties
    if (
      error &&
      typeof error === "object" &&
      (("name" in error && error.name === "NotFound") ||
        ("$metadata" in error &&
          (error as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode === 404))
    ) {
      return false;
    }
    throw error;
  }
}

/**
 * Get file metadata without downloading content
 *
 * @param key - Object key (path) to check
 * @returns File metadata
 */
export async function getFileMetadata(key: string) {
  const command = new HeadObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  const result = await s3Client.send(command);

  return {
    key,
    size: result.ContentLength,
    contentType: result.ContentType,
    lastModified: result.LastModified,
    etag: result.ETag,
    metadata: result.Metadata,
  };
}

/**
 * Generate a presigned URL for temporary file access
 *
 * @param key - Object key (path) in the bucket
 * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns Presigned URL
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Upload a file from a local File/Blob object (browser)
 *
 * @param key - Object key (path) in the bucket
 * @param file - File or Blob object
 * @returns Upload result
 */
export async function uploadFileFromBlob(key: string, file: File | Blob) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const contentType =
    file instanceof File ? file.type : "application/octet-stream";

  return await uploadFile(key, buffer, contentType);
}
