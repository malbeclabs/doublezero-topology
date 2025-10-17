/**
 * Tests for S3 Operations
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

// Mock the S3 client
const s3Mock = mockClient(S3Client);

// Import operations after mocking
import {
  uploadFile,
  downloadFile,
  downloadFileAsString,
  downloadJsonFile,
  listFiles,
  deleteFile,
  fileExists,
  getFileMetadata,
} from "@/lib/s3/operations";

describe("S3 Operations", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    s3Mock.reset();
  });

  describe("uploadFile", () => {
    it("should upload a file successfully", async () => {
      s3Mock.on(PutObjectCommand).resolves({
        ETag: '"test-etag"',
        VersionId: "test-version",
      });

      const result = await uploadFile(
        "test/file.txt",
        Buffer.from("test content"),
        "text/plain"
      );

      expect(result).toEqual({
        success: true,
        key: "test/file.txt",
        etag: '"test-etag"',
        versionId: "test-version",
      });
    });
  });

  describe("downloadFile", () => {
    it("should download a file as Buffer", async () => {
      const mockStream = Readable.from([Buffer.from("test content")]);

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockStream as any,
      });

      const result = await downloadFile("test/file.txt");

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe("test content");
    });

    it("should throw error if no body returned", async () => {
      s3Mock.on(GetObjectCommand).resolves({
        Body: undefined,
      });

      await expect(downloadFile("test/file.txt")).rejects.toThrow(
        "No body returned for key: test/file.txt"
      );
    });
  });

  describe("downloadFileAsString", () => {
    it("should download file as string", async () => {
      const mockStream = Readable.from([Buffer.from("test string content")]);

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockStream as any,
      });

      const result = await downloadFileAsString("test/file.txt");

      expect(result).toBe("test string content");
    });
  });

  describe("downloadJsonFile", () => {
    it("should download and parse JSON file", async () => {
      const jsonData = { name: "test", value: 123 };
      const mockStream = Readable.from([Buffer.from(JSON.stringify(jsonData))]);

      s3Mock.on(GetObjectCommand).resolves({
        Body: mockStream as any,
      });

      const result = await downloadJsonFile("test/data.json");

      expect(result).toEqual(jsonData);
    });
  });

  describe("listFiles", () => {
    it("should list files in bucket", async () => {
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: [
          {
            Key: "test/file1.txt",
            Size: 100,
            LastModified: new Date("2025-01-01"),
          },
          {
            Key: "test/file2.txt",
            Size: 200,
            LastModified: new Date("2025-01-02"),
          },
        ],
        KeyCount: 2,
        IsTruncated: false,
      });

      const result = await listFiles("test/");

      expect(result.count).toBe(2);
      expect(result.files).toHaveLength(2);
      expect(result.isTruncated).toBe(false);
    });

    it("should handle empty list", async () => {
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: [],
        KeyCount: 0,
        IsTruncated: false,
      });

      const result = await listFiles();

      expect(result.count).toBe(0);
      expect(result.files).toHaveLength(0);
    });
  });

  describe("deleteFile", () => {
    it("should delete a file successfully", async () => {
      s3Mock.on(DeleteObjectCommand).resolves({
        DeleteMarker: true,
        VersionId: "test-version",
      });

      const result = await deleteFile("test/file.txt");

      expect(result).toEqual({
        success: true,
        key: "test/file.txt",
        deleteMarker: true,
        versionId: "test-version",
      });
    });
  });

  describe("fileExists", () => {
    it("should return true if file exists", async () => {
      s3Mock.on(HeadObjectCommand).resolves({
        ContentLength: 100,
      });

      const result = await fileExists("test/file.txt");

      expect(result).toBe(true);
    });

    it("should return false if file does not exist", async () => {
      s3Mock.on(HeadObjectCommand).rejects({
        name: "NotFound",
        $metadata: { httpStatusCode: 404 },
      });

      const result = await fileExists("test/nonexistent.txt");

      expect(result).toBe(false);
    });

    it("should throw error for other errors", async () => {
      s3Mock.on(HeadObjectCommand).rejects(new Error("Network error"));

      await expect(fileExists("test/file.txt")).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("getFileMetadata", () => {
    it("should return file metadata", async () => {
      const lastModified = new Date("2025-01-01");

      s3Mock.on(HeadObjectCommand).resolves({
        ContentLength: 1024,
        ContentType: "application/json",
        LastModified: lastModified,
        ETag: '"test-etag"',
        Metadata: { custom: "value" },
      });

      const result = await getFileMetadata("test/file.json");

      expect(result).toEqual({
        key: "test/file.json",
        size: 1024,
        contentType: "application/json",
        lastModified: lastModified,
        etag: '"test-etag"',
        metadata: { custom: "value" },
      });
    });
  });
});
