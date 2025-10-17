/**
 * S3 Client Configuration
 *
 * Configures AWS SDK S3Client for both MinIO (local development)
 * and AWS S3 (production) compatibility.
 *
 * Key configuration:
 * - forcePathStyle: true - REQUIRED for MinIO compatibility
 * - Reads credentials from environment variables
 */

import { S3Client } from "@aws-sdk/client-s3";

// Validate required environment variables
const requiredEnvVars = [
  "S3_REGION",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_BUCKET",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// S3 client configuration
const s3Config = {
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  // CRITICAL: forcePathStyle must be true for MinIO compatibility
  // MinIO uses path-style URLs: http://localhost:9000/bucket/key
  // AWS S3 uses virtual-hosted style: http://bucket.s3.amazonaws.com/key
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",

  // Optional: Custom endpoint for MinIO (local development)
  ...(process.env.S3_ENDPOINT && {
    endpoint: process.env.S3_ENDPOINT,
  }),
};

// Create and export singleton S3 client instance
export const s3Client = new S3Client(s3Config);

// Export bucket name for convenience
export const S3_BUCKET = process.env.S3_BUCKET!;

// Export configuration for debugging/testing
export const s3ConfigInfo = {
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT || "AWS S3",
  bucket: process.env.S3_BUCKET,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
};
