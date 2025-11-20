/**
 * Unit Tests: ISIS Detector
 *
 * Tests timestamp parsing, URL building, and file detection logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseIsisTimestamp,
  buildIsisUrl,
  detectLatestIsis,
  detectLatestIsisForDate,
} from "@/lib/s3/isis-detector";

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

      const timestamp = new Date("2025-11-20T15:42:04Z");
      const url = buildIsisUrl(timestamp);

      expect(url).toContain("custom-bucket");

      // Restore original
      if (originalEnv) {
        process.env.NEXT_PUBLIC_S3_ISIS_BUCKET_URL = originalEnv;
      } else {
        delete process.env.NEXT_PUBLIC_S3_ISIS_BUCKET_URL;
      }
    });
  });

  describe("detectLatestIsis", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should find latest file within 30 days", async () => {
      // Set current time to 2025-11-20 22:00 UTC (after all uploads for the day)
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-11-20T22:00:00Z"));

      // Mock fetch for HEAD requests
      global.fetch = vi.fn((url) => {
        if ((url as string).includes("2025-11-20T21-42-04Z")) {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      });

      const result = await detectLatestIsis();
      expect(result).toBeTruthy();
      expect(result?.url).toContain("2025-11-20T21-42-04Z_upload_data.json");

      vi.useRealTimers();
    });

    it("should skip future timestamps", async () => {
      // Set current time to 2025-11-20 10:00 UTC
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-11-20T10:00:00Z"));

      global.fetch = vi.fn((url) => {
        // Files at 03:42 and 09:42 exist, but 15:42 and 21:42 are future
        if (
          (url as string).includes("T09-42-04Z") ||
          (url as string).includes("T03-42-04Z")
        ) {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      });

      const result = await detectLatestIsis();
      expect(result?.url).toContain("T09-42-04Z"); // Should find 09:42, not 15:42

      vi.useRealTimers();
    });

    it("should return null if no files found in 30 days", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({ ok: false } as Response)
      );

      const result = await detectLatestIsis();
      expect(result).toBeNull();
    });

    it("should check files in reverse chronological order", async () => {
      // Set current time to 2025-11-20 22:00 UTC
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-11-20T22:00:00Z"));

      const checkedUrls: string[] = [];

      global.fetch = vi.fn((url) => {
        checkedUrls.push(url as string);
        // Return true for an older file
        if ((url as string).includes("2025-11-19T15-42-04Z")) {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      });

      await detectLatestIsis();

      // Should check today's files before yesterday's
      const todayIndex = checkedUrls.findIndex((url) =>
        url.includes("2025-11-20")
      );
      const yesterdayIndex = checkedUrls.findIndex((url) =>
        url.includes("2025-11-19")
      );

      expect(todayIndex).toBeLessThan(yesterdayIndex);

      vi.useRealTimers();
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
      global.fetch = vi.fn((url) => {
        // 21:42 and 15:42 exist for 2025-11-20
        if (
          (url as string).includes("2025-11-20T21-42-04Z") ||
          (url as string).includes("2025-11-20T15-42-04Z")
        ) {
          return Promise.resolve({ ok: true } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      });

      const result = await detectLatestIsisForDate("2025-11-20");
      expect(result).toBeTruthy();
      expect(result?.url).toContain("2025-11-20T21-42-04Z"); // Should find latest (21:42)
    });

    it("should return null if no files found for date", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({ ok: false } as Response)
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

    it("should check upload times in reverse order", async () => {
      const checkedUrls: string[] = [];

      global.fetch = vi.fn((url) => {
        checkedUrls.push(url as string);
        return Promise.resolve({ ok: false } as Response);
      });

      await detectLatestIsisForDate("2025-11-20");

      // Should check 21:42 before 15:42
      const latest = checkedUrls.findIndex((url) => url.includes("T21-42-04Z"));
      const earlier = checkedUrls.findIndex((url) => url.includes("T15-42-04Z"));

      expect(latest).toBeLessThan(earlier);
    });
  });
});
