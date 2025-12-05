/**
 * Unit tests for Epoch Detection Algorithm
 *
 * Tests the automatic detection of latest available snapshot epochs in S3
 * using the ListBucket API.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  parseEpochFromFilename,
  listAvailableEpochs,
  detectLatestEpoch,
  detectLatestEpochWithProgress,
  isEpochAvailable,
  getAvailableEpochs,
} from "@/lib/s3/epoch-detector";

/**
 * Helper to create mock S3 ListBucket XML response
 */
function createMockListResponse(files: string[]): string {
  const contents = files
    .map(
      (key) => `<Contents><Key>${key}</Key><Size>50000000</Size></Contents>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
    <ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
      <Name>doublezero-contributor-rewards-mn-beta-snapshots</Name>
      <KeyCount>${files.length}</KeyCount>
      ${contents}
    </ListBucketResult>`;
}

describe("Epoch Detection Algorithm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("parseEpochFromFilename", () => {
    it("should parse valid snapshot filename", () => {
      expect(parseEpochFromFilename("mn-epoch-63-snapshot.json")).toBe(63);
      expect(parseEpochFromFilename("mn-epoch-31-snapshot.json")).toBe(31);
      expect(parseEpochFromFilename("mn-epoch-100-snapshot.json")).toBe(100);
    });

    it("should return null for invalid format", () => {
      expect(parseEpochFromFilename("invalid.json")).toBeNull();
      expect(parseEpochFromFilename("mn-epoch-abc-snapshot.json")).toBeNull();
      expect(parseEpochFromFilename("snapshot-63.json")).toBeNull();
      expect(parseEpochFromFilename("")).toBeNull();
      // ISIS db files have different format
      expect(parseEpochFromFilename("2025-12-05T15-42-06Z_upload_data.json")).toBeNull();
    });
  });

  describe("listAvailableEpochs", () => {
    it("should list and sort epochs from S3", async () => {
      const mockFiles = [
        "mn-epoch-61-snapshot.json",
        "mn-epoch-63-snapshot.json",
        "mn-epoch-62-snapshot.json",
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse(mockFiles)),
        } as Response)
      );

      const epochs = await listAvailableEpochs();

      expect(epochs).toEqual([63, 62, 61]); // Sorted descending
    });

    it("should filter out invalid filenames", async () => {
      const mockFiles = [
        "mn-epoch-63-snapshot.json",
        "some-other-file.json",
        "readme.txt",
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse(mockFiles)),
        } as Response)
      );

      const epochs = await listAvailableEpochs();

      expect(epochs).toEqual([63]);
    });

    it("should throw error on failed request", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 403,
        } as Response)
      );

      await expect(listAvailableEpochs()).rejects.toThrow("Failed to list epochs");
    });
  });

  describe("detectLatestEpoch", () => {
    it("should find latest epoch from listing", async () => {
      const mockFiles = [
        "mn-epoch-31-snapshot.json",
        "mn-epoch-62-snapshot.json",
        "mn-epoch-63-snapshot.json",
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse(mockFiles)),
        } as Response)
      );

      const latest = await detectLatestEpoch();
      expect(latest).toBe(63);
    });

    it("should handle gaps in epoch numbering", async () => {
      // epochs 31, 33, 35 exist (no 32, 34)
      const mockFiles = [
        "mn-epoch-31-snapshot.json",
        "mn-epoch-33-snapshot.json",
        "mn-epoch-35-snapshot.json",
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse(mockFiles)),
        } as Response)
      );

      const latest = await detectLatestEpoch();
      expect(latest).toBe(35);
    });

    it("should return null when no epochs exist", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse([])),
        } as Response)
      );

      const latest = await detectLatestEpoch();
      expect(latest).toBeNull();
    });
  });

  describe("detectLatestEpochWithProgress", () => {
    it("should call progress callback with latest epoch", async () => {
      const mockFiles = [
        "mn-epoch-62-snapshot.json",
        "mn-epoch-63-snapshot.json",
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse(mockFiles)),
        } as Response)
      );

      const progressCallback = vi.fn();
      const latest = await detectLatestEpochWithProgress(progressCallback);

      expect(latest).toBe(63);
      expect(progressCallback).toHaveBeenCalledWith(63, 63);
    });

    it("should work without progress callback", async () => {
      const mockFiles = ["mn-epoch-63-snapshot.json"];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse(mockFiles)),
        } as Response)
      );

      const latest = await detectLatestEpochWithProgress();
      expect(latest).toBe(63);
    });

    it("should return null when no epochs exist", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse([])),
        } as Response)
      );

      const progressCallback = vi.fn();
      const latest = await detectLatestEpochWithProgress(progressCallback);

      expect(latest).toBeNull();
      expect(progressCallback).not.toHaveBeenCalled();
    });
  });

  describe("isEpochAvailable", () => {
    it("should return true when epoch exists", async () => {
      const mockFiles = [
        "mn-epoch-62-snapshot.json",
        "mn-epoch-63-snapshot.json",
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse(mockFiles)),
        } as Response)
      );

      const available = await isEpochAvailable(63);
      expect(available).toBe(true);
    });

    it("should return false when epoch doesn't exist", async () => {
      const mockFiles = [
        "mn-epoch-62-snapshot.json",
        "mn-epoch-63-snapshot.json",
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse(mockFiles)),
        } as Response)
      );

      const available = await isEpochAvailable(64);
      expect(available).toBe(false);
    });
  });

  describe("getAvailableEpochs", () => {
    it("should return list of available epochs in range", async () => {
      const mockFiles = [
        "mn-epoch-31-snapshot.json",
        "mn-epoch-55-snapshot.json",
        "mn-epoch-60-snapshot.json",
        "mn-epoch-63-snapshot.json",
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse(mockFiles)),
        } as Response)
      );

      const available = await getAvailableEpochs(50, 65);
      expect(available).toEqual([55, 60, 63]); // Sorted ascending, filtered to range
    });

    it("should return empty array when no epochs in range", async () => {
      const mockFiles = [
        "mn-epoch-31-snapshot.json",
        "mn-epoch-35-snapshot.json",
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse(mockFiles)),
        } as Response)
      );

      const available = await getAvailableEpochs(50, 60);
      expect(available).toEqual([]);
    });

    it("should handle reversed range (endEpoch < startEpoch)", async () => {
      const mockFiles = [
        "mn-epoch-62-snapshot.json",
        "mn-epoch-63-snapshot.json",
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(createMockListResponse(mockFiles)),
        } as Response)
      );

      const available = await getAvailableEpochs(65, 60);
      expect(available).toEqual([62, 63]);
    });
  });
});
