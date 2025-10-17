/**
 * Tests for S3 Client Configuration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

describe("S3 Client Configuration", () => {
  beforeEach(() => {
    // Reset modules to clear cached imports
    vi.resetModules();
  });

  it("should create S3 client with correct configuration", async () => {
    const { s3Client, s3ConfigInfo } = await import("@/lib/s3/client");

    expect(s3Client).toBeDefined();
    expect(s3ConfigInfo).toEqual({
      region: "us-east-1",
      endpoint: "http://localhost:9000",
      bucket: "test-bucket",
      forcePathStyle: true,
    });
  });

  it("should export S3_BUCKET constant", async () => {
    const { S3_BUCKET } = await import("@/lib/s3/client");
    expect(S3_BUCKET).toBe("test-bucket");
  });

  it("should have forcePathStyle enabled for MinIO", async () => {
    const { s3ConfigInfo } = await import("@/lib/s3/client");
    expect(s3ConfigInfo.forcePathStyle).toBe(true);
  });

  it("should throw error if required env vars are missing", async () => {
    // Save original env vars
    const originalEnv = { ...process.env };

    // Remove required env var
    delete process.env.S3_REGION;

    try {
      // Reset module cache to force re-import
      vi.resetModules();

      // This should throw an error
      await expect(async () => {
        await import("@/lib/s3/client");
      }).rejects.toThrow("Missing required environment variable");
    } finally {
      // Restore env vars
      process.env = originalEnv;
    }
  });
});
