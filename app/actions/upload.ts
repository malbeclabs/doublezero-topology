"use server";

/**
 * Server Action for uploading topology JSON files to S3/MinIO
 *
 * Validates and uploads two files:
 * - snapshot.json (max 100MB) - Contains serviceability and telemetry data
 * - isis-db.json (max 10MB) - Contains IS-IS routing protocol data
 *
 * Files are uploaded to S3/MinIO with unique timestamped filenames
 */

import { z } from "zod";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET } from "@/lib/s3/client";

// Validation schemas
const MAX_SNAPSHOT_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_ISIS_SIZE = 10 * 1024 * 1024; // 10MB

const FileSchema = z.object({
  snapshot: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_SNAPSHOT_SIZE, {
      message: "Snapshot file must be less than 100MB",
    })
    .refine((file) => file.name.endsWith(".json"), {
      message: "Snapshot file must be a JSON file",
    }),
  isis: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_ISIS_SIZE, {
      message: "ISIS file must be less than 10MB",
    })
    .refine((file) => file.name.endsWith(".json"), {
      message: "ISIS file must be a JSON file",
    }),
});

/**
 * Response type for upload action
 */
type UploadResult =
  | {
      success: true;
      data: {
        snapshotKey: string;
        isisKey: string;
      };
    }
  | {
      success: false;
      error: string;
    };

/**
 * Upload files to S3/MinIO
 *
 * @param formData - FormData containing 'snapshot' and 'isis' files
 * @returns Upload result with S3 keys or error message
 */
export async function uploadFiles(formData: FormData): Promise<UploadResult> {
  try {
    // Extract files from FormData
    const snapshot = formData.get("snapshot");
    const isis = formData.get("isis");

    // Validate files exist
    if (!snapshot || !(snapshot instanceof File)) {
      return {
        success: false,
        error: "Missing or invalid snapshot file",
      };
    }

    if (!isis || !(isis instanceof File)) {
      return {
        success: false,
        error: "Missing or invalid isis file",
      };
    }

    // Validate file constraints
    const validation = FileSchema.safeParse({ snapshot, isis });
    if (!validation.success) {
      const errorMessages = validation.error.issues
        .map((issue) => issue.message)
        .join(", ");
      return {
        success: false,
        error: errorMessages,
      };
    }

    // Validate JSON format by attempting to parse
    try {
      const snapshotText = await snapshot.text();
      JSON.parse(snapshotText);
    } catch {
      return {
        success: false,
        error: "Snapshot file contains invalid JSON",
      };
    }

    try {
      const isisText = await isis.text();
      JSON.parse(isisText);
    } catch {
      return {
        success: false,
        error: "ISIS file contains invalid JSON",
      };
    }

    // Generate unique filenames with timestamp
    const timestamp = Date.now();
    const snapshotKey = `snapshots/${timestamp}-snapshot.json`;
    const isisKey = `isis/${timestamp}-isis.json`;

    // Upload snapshot file
    const snapshotBuffer = await snapshot.arrayBuffer();
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: snapshotKey,
        Body: Buffer.from(snapshotBuffer),
        ContentType: "application/json",
      })
    );

    // Upload isis file
    const isisBuffer = await isis.arrayBuffer();
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: isisKey,
        Body: Buffer.from(isisBuffer),
        ContentType: "application/json",
      })
    );

    return {
      success: true,
      data: {
        snapshotKey,
        isisKey,
      },
    };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? `Upload failed: ${error.message}`
          : "Upload failed: Unknown error",
    };
  }
}
