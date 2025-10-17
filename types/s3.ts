/**
 * S3/MinIO Type Definitions
 *
 * Type definitions for S3 operations and responses.
 */

/**
 * Result of a file upload operation
 */
export interface UploadResult {
  success: boolean;
  key: string;
  etag?: string;
  versionId?: string;
}

/**
 * Result of a file deletion operation
 */
export interface DeleteResult {
  success: boolean;
  key: string;
  deleteMarker?: boolean;
  versionId?: string;
}

/**
 * File metadata from S3/MinIO
 */
export interface FileMetadata {
  key: string;
  size?: number;
  contentType?: string;
  lastModified?: Date;
  etag?: string;
  metadata?: Record<string, string>;
}

/**
 * S3 object information from list operations
 */
export interface S3Object {
  Key?: string;
  LastModified?: Date;
  ETag?: string;
  Size?: number;
  StorageClass?: string;
  Owner?: {
    DisplayName?: string;
    ID?: string;
  };
}

/**
 * Result of a list files operation
 */
export interface ListFilesResult {
  files: S3Object[];
  count: number;
  isTruncated: boolean;
  nextContinuationToken?: string;
}

/**
 * S3 configuration information
 */
export interface S3Config {
  region: string;
  endpoint: string;
  bucket: string;
  forcePathStyle: boolean;
}

/**
 * File upload input for Next.js Server Actions
 */
export interface FileUploadInput {
  key: string;
  file: File;
  metadata?: Record<string, string>;
}

/**
 * Standard prefixes for organizing files in the bucket
 */
export const S3_PREFIXES = {
  SNAPSHOTS: "snapshots/",
  ISIS: "isis/",
  PROCESSED: "processed/",
} as const;

export type S3Prefix = (typeof S3_PREFIXES)[keyof typeof S3_PREFIXES];
