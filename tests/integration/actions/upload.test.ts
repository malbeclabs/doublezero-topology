/**
 * Integration tests for file upload server action
 *
 * Tests:
 * - File validation (size, type, structure)
 * - S3 upload functionality
 * - Error handling
 * - Success responses
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-vitest';

// Mock the S3 client module before importing upload action
vi.mock('@/lib/s3/client', () => {
  const { S3Client } = require('@aws-sdk/client-s3');
  return {
    s3Client: new S3Client({}),
    S3_BUCKET: 'dztopo'
  };
});

// Import after mocking
const { uploadFiles } = await import('@/app/actions/upload');

const s3Mock = mockClient(S3Client);

describe('uploadFiles Server Action', () => {
  beforeAll(() => {
    // Mock environment variables
    process.env.S3_ENDPOINT = 'http://localhost:9000';
    process.env.S3_REGION = 'us-east-1';
    process.env.S3_ACCESS_KEY_ID = 'minioadmin';
    process.env.S3_SECRET_ACCESS_KEY = 'minioadmin';
    process.env.S3_BUCKET = 'dztopo';
    process.env.S3_FORCE_PATH_STYLE = 'true';
  });

  afterEach(() => {
    s3Mock.reset();
  });

  afterAll(() => {
    s3Mock.restore();
  });

  describe('File Validation', () => {
    it('should reject snapshot file larger than 100MB', async () => {
      const largeContent = 'x'.repeat(101 * 1024 * 1024); // 101MB
      const formData = new FormData();
      formData.append('snapshot', new File([largeContent], 'snapshot.json', { type: 'application/json' }));
      formData.append('isis', new File(['{}'], 'isis.json', { type: 'application/json' }));

      const result = await uploadFiles(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.toLowerCase()).toMatch(/snapshot|size|100mb|validation/);
    });

    it('should reject isis file larger than 10MB', async () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      const formData = new FormData();
      formData.append('snapshot', new File(['{}'], 'snapshot.json', { type: 'application/json' }));
      formData.append('isis', new File([largeContent], 'isis.json', { type: 'application/json' }));

      const result = await uploadFiles(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.toLowerCase()).toMatch(/isis|size|10mb|validation/);
    });

    it('should reject missing snapshot file', async () => {
      const formData = new FormData();
      formData.append('isis', new File(['{}'], 'isis.json', { type: 'application/json' }));

      const result = await uploadFiles(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('snapshot');
    });

    it('should reject missing isis file', async () => {
      const formData = new FormData();
      formData.append('snapshot', new File(['{}'], 'snapshot.json', { type: 'application/json' }));

      const result = await uploadFiles(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('isis');
    });

    it('should reject non-JSON files', async () => {
      const formData = new FormData();
      formData.append('snapshot', new File(['test'], 'snapshot.txt', { type: 'text/plain' }));
      formData.append('isis', new File(['test'], 'isis.txt', { type: 'text/plain' }));

      const result = await uploadFiles(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.toLowerCase()).toMatch(/json|validation/);
    });

    it('should reject invalid JSON content in snapshot', async () => {
      const formData = new FormData();
      formData.append('snapshot', new File(['not valid json'], 'snapshot.json', { type: 'application/json' }));
      formData.append('isis', new File(['{}'], 'isis.json', { type: 'application/json' }));

      const result = await uploadFiles(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('JSON');
    });

    it('should reject invalid JSON content in isis file', async () => {
      const formData = new FormData();
      formData.append('snapshot', new File(['{}'], 'snapshot.json', { type: 'application/json' }));
      formData.append('isis', new File(['not valid json'], 'isis.json', { type: 'application/json' }));

      const result = await uploadFiles(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('JSON');
    });
  });

  describe('S3 Upload Functionality', () => {
    it('should successfully upload valid files', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      const snapshotContent = JSON.stringify({ fetch_data: { dz_serviceability: { links: [] } } });
      const isisContent = JSON.stringify({ vrfs: { default: { isisInstances: {} } } });

      const formData = new FormData();
      formData.append('snapshot', new File([snapshotContent], 'snapshot.json', { type: 'application/json' }));
      formData.append('isis', new File([isisContent], 'isis.json', { type: 'application/json' }));

      const result = await uploadFiles(formData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.snapshotKey).toMatch(/^snapshots\/\d+-snapshot\.json$/);
      expect(result.data?.isisKey).toMatch(/^isis\/\d+-isis\.json$/);

      // Verify S3 calls were made
      expect(s3Mock.commandCalls(PutObjectCommand).length).toBe(2);
    });

    it('should generate unique filenames for uploads', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      const snapshotContent = JSON.stringify({ fetch_data: { dz_serviceability: { links: [] } } });
      const isisContent = JSON.stringify({ vrfs: { default: { isisInstances: {} } } });

      const formData1 = new FormData();
      formData1.append('snapshot', new File([snapshotContent], 'snapshot.json', { type: 'application/json' }));
      formData1.append('isis', new File([isisContent], 'isis.json', { type: 'application/json' }));

      const result1 = await uploadFiles(formData1);

      // Wait 2ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 2));

      const formData2 = new FormData();
      formData2.append('snapshot', new File([snapshotContent], 'snapshot.json', { type: 'application/json' }));
      formData2.append('isis', new File([isisContent], 'isis.json', { type: 'application/json' }));

      const result2 = await uploadFiles(formData2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data?.snapshotKey).not.toBe(result2.data?.snapshotKey);
      expect(result1.data?.isisKey).not.toBe(result2.data?.isisKey);
    });

    it('should upload files to correct S3 paths', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      const snapshotContent = JSON.stringify({ fetch_data: { dz_serviceability: { links: [] } } });
      const isisContent = JSON.stringify({ vrfs: { default: { isisInstances: {} } } });

      const formData = new FormData();
      formData.append('snapshot', new File([snapshotContent], 'snapshot.json', { type: 'application/json' }));
      formData.append('isis', new File([isisContent], 'isis.json', { type: 'application/json' }));

      await uploadFiles(formData);

      const calls = s3Mock.commandCalls(PutObjectCommand);
      expect(calls[0].args[0].input.Key).toMatch(/^snapshots\//);
      expect(calls[1].args[0].input.Key).toMatch(/^isis\//);
    });
  });

  describe('Error Handling', () => {
    it('should handle S3 upload failure', async () => {
      s3Mock.on(PutObjectCommand).rejects(new Error('S3 upload failed'));

      const snapshotContent = JSON.stringify({ fetch_data: { dz_serviceability: { links: [] } } });
      const isisContent = JSON.stringify({ vrfs: { default: { isisInstances: {} } } });

      const formData = new FormData();
      formData.append('snapshot', new File([snapshotContent], 'snapshot.json', { type: 'application/json' }));
      formData.append('isis', new File([isisContent], 'isis.json', { type: 'application/json' }));

      const result = await uploadFiles(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('upload');
    });

    it('should handle file read errors', async () => {
      const formData = new FormData();

      // Create a mock file that throws on read
      const mockFile = new File(['test'], 'snapshot.json', { type: 'application/json' });
      Object.defineProperty(mockFile, 'arrayBuffer', {
        value: () => Promise.reject(new Error('File read error'))
      });

      formData.append('snapshot', mockFile);
      formData.append('isis', new File(['{}'], 'isis.json', { type: 'application/json' }));

      const result = await uploadFiles(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return structured error messages', async () => {
      const formData = new FormData();

      const result = await uploadFiles(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });
  });

  describe('Response Format', () => {
    it('should return success response with file keys', async () => {
      s3Mock.on(PutObjectCommand).resolves({});

      const snapshotContent = JSON.stringify({ fetch_data: { dz_serviceability: { links: [] } } });
      const isisContent = JSON.stringify({ vrfs: { default: { isisInstances: {} } } });

      const formData = new FormData();
      formData.append('snapshot', new File([snapshotContent], 'snapshot.json', { type: 'application/json' }));
      formData.append('isis', new File([isisContent], 'isis.json', { type: 'application/json' }));

      const result = await uploadFiles(formData);

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('snapshotKey');
      expect(result.data).toHaveProperty('isisKey');
    });

    it('should return error response with error message', async () => {
      const formData = new FormData();

      const result = await uploadFiles(formData);

      expect(result).toHaveProperty('success');
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    });
  });
});
