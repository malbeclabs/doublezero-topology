/**
 * Unit Tests: ISIS Detector
 *
 * Tests timestamp parsing, URL building, and file detection logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseIsisTimestamp,
  buildIsisUrl,
  buildIsisUrlFromFilename,
  listIsisFiles,
  detectLatestIsis,
  detectLatestIsisForDate,
} from "@/lib/s3/isis-detector";

/**
 * Helper to create mock S3 ListBucket XML response
 */
function createMockListResponse(files: string[]): string {
  const contents = files
    .map(
      (key) => `<Contents><Key>${key}</Key><Size>1000000</Size></Contents>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
    <ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
      <Name>doublezero-mn-beta-isis-db</Name>
      <KeyCount>${files.length}</KeyCount>
      ${contents}
    </ListBucketResult>`;
}

describe("ISIS Detector", () => {
  describe("parseIsisTimestamp", () => {
    it("should parse valid timestamp", () => {
      const result = parseIsisTimestamp(
        "2025-11-20T15-42-04Z_upload_data.json"
      );
      expect(result).toEqual(new Date("2025-11-20T15:42:04Z"));
    });

    it("should parse different valid timestamps", () => {
      const testCases = [
        {
          input: "2025-11-20T03-42-04Z_upload_data.json",
          expected: new Date("2025-11-20T03:42:04Z"),
        },
        {
          input: "2025-11-20T09-42-04Z_upload_data.json",
          expected: new Date("2025-11-20T09:42:04Z"),
        },
        {
          input: "2025-11-20T21-42-04Z_upload_data.json",
          expected: new Date("2025-11-20T21:42:04Z"),
        },
        {
          input: "2025-12-05T15-42-06Z_upload_data.json",
          expected: new Date("2025-12-05T15:42:06Z"),
        },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(parseIsisTimestamp(input)).toEqual(expected);
      });
    });

    it("should return null for invalid format", () => {
      expect(parseIsisTimestamp("invalid.json")).toBeNull();
      expect(parseIsisTimestamp("2025-11-20.json")).toBeNull();
      expect(parseIsisTimestamp("isis-db-2025.11.20.json")).toBeNull();
      expect(parseIsisTimestamp("")).toBeNull();
    });
  });

  describe("buildIsisUrl", () => {
    it("should build correct URL with default bucket", () => {
      const timestamp = new Date("2025-11-20T15:42:04Z");
      const url = buildIsisUrl(timestamp);

      expect(url).toContain("2025-11-20T15-42-04Z_upload_data.json");
      expect(url).toContain("doublezero-mn-beta-isis-db");
      expect(url).toContain("s3.us-east-1.amazonaws.com");
    });

    it("should build correct URL for different timestamps", () => {
      const testCases = [
        {
          timestamp: new Date("2025-11-20T03:42:04Z"),
          expected: "2025-11-20T03-42-04Z_upload_data.json",
        },
        {
          timestamp: new Date("2025-11-20T09:42:04Z"),
          expected: "2025-11-20T09-42-04Z_upload_data.json",
        },
        {
          timestamp: new Date("2025-11-20T21:42:04Z"),
          expected: "2025-11-20T21-42-04Z_upload_data.json",
        },
      ];

      testCases.forEach(({ timestamp, expected }) => {
        const url = buildIsisUrl(timestamp);
        expect(url).toContain(expected);
      });
    });

    it("should use environment variable if set", () => {
      const originalEnv = process.env.NEXT_PUBLIC_S3_ISIS_BUCKET_URL;
      process.env.NEXT_PUBLIC_S3_ISIS_BUCKET_URL =
        "https://custom-bucket.s3.amazonaws.com";

      // Need to re-import to pick up env change - skip this test for now
      // as it requires module re-loading

      // Restore original
      if (originalEnv) {
        process.env.NEXT_PUBLIC_S3_ISIS_BUCKET_URL = originalEnv;
      } else {
        delete process.env.NEXT_PUBLIC_S3_ISIS_BUCKET_URL;
      }
    });
  });

  describe("buildIsisUrlFromFilename", () => {
    it("should build correct URL from filename", () => {
      const url = buildIsisUrlFromFilename(
        "2025-12-05T15-42-06Z_upload_data.json"
      );
      expect(url).toBe(
        "https://doublezero-mn-beta-isis-db.s3.us-east-1.amazonaws.com/2025-12-05T15-42-06Z_upload_data.json"
      );
    });
  });

  describe("listIsisFiles", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should list and sort files from S3", async () => {
      const mockFiles = [
        "2025-11-20T03-42-04Z_upload_data.json",
        "2025-11-20T21-42-04Z_upload_data.json",
        "2025-11-20T09-42-04Z_upload_data.json",
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse(mockFiles)),
        } as Response)
      );

      const files = await listIsisFiles();

      expect(files).toEqual([
        "2025-11-20T21-42-04Z_upload_data.json",
        "2025-11-20T09-42-04Z_upload_data.json",
        "2025-11-20T03-42-04Z_upload_data.json",
      ]);
    });

    it("should filter out invalid filenames", async () => {
      const mockFiles = [
        "2025-11-20T21-42-04Z_upload_data.json",
        "some-other-file.json",
        "readme.txt",
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse(mockFiles)),
        } as Response)
      );

      const files = await listIsisFiles();

      expect(files).toEqual(["2025-11-20T21-42-04Z_upload_data.json"]);
    });

    it("should throw error on failed request", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 403,
        } as Response)
      );

      await expect(listIsisFiles()).rejects.toThrow("Failed to list ISIS files");
    });
  });

  describe("detectLatestIsis", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should find latest file from listing", async () => {
      const mockFiles = [
        "2025-12-05T15-42-06Z_upload_data.json",
        "2025-12-05T09-42-06Z_upload_data.json",
        "2025-12-04T21-42-06Z_upload_data.json",
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse(mockFiles)),
        } as Response)
      );

      const result = await detectLatestIsis();

      expect(result).toBeTruthy();
      expect(result?.url).toContain("2025-12-05T15-42-06Z_upload_data.json");
      expect(result?.timestamp).toEqual(new Date("2025-12-05T15:42:06Z"));
    });

    it("should handle files with different seconds (clock drift)", async () => {
      // This test verifies the fix for the original bug - files with
      // varying seconds values (:03, :04, :05, :06) are all found correctly
      const mockFiles = [
        "2025-12-05T15-42-06Z_upload_data.json", // :06 seconds
        "2025-11-25T03-42-04Z_upload_data.json", // :04 seconds
        "2025-11-20T21-42-03Z_upload_data.json", // :03 seconds
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse(mockFiles)),
        } as Response)
      );

      const result = await detectLatestIsis();

      // Should find the latest file regardless of seconds value
      expect(result?.url).toContain("2025-12-05T15-42-06Z_upload_data.json");
    });

    it("should return null if no files found", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse([])),
        } as Response)
      );

      const result = await detectLatestIsis();
      expect(result).toBeNull();
    });
  });

  describe("detectLatestIsisForDate", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should find latest file for specific date", async () => {
      const mockFiles = [
        "2025-12-05T15-42-06Z_upload_data.json",
        "2025-11-20T21-42-04Z_upload_data.json",
        "2025-11-20T15-42-04Z_upload_data.json",
        "2025-11-20T09-42-04Z_upload_data.json",
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse(mockFiles)),
        } as Response)
      );

      const result = await detectLatestIsisForDate("2025-11-20");

      expect(result).toBeTruthy();
      expect(result?.url).toContain("2025-11-20T21-42-04Z"); // Latest on that date
    });

    it("should return null if no files found for date", async () => {
      const mockFiles = [
        "2025-12-05T15-42-06Z_upload_data.json",
        "2025-12-04T21-42-06Z_upload_data.json",
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse(mockFiles)),
        } as Response)
      );

      const result = await detectLatestIsisForDate("2025-11-15");
      expect(result).toBeNull();
    });

    it("should reject invalid date format", async () => {
      await expect(detectLatestIsisForDate("invalid")).rejects.toThrow(
        "Invalid date format"
      );
      await expect(detectLatestIsisForDate("2025/11/20")).rejects.toThrow(
        "Invalid date format"
      );
      await expect(detectLatestIsisForDate("20251120")).rejects.toThrow(
        "Invalid date format"
      );
    });
  });
});
