/**
 * Vitest Setup File
 *
 * This file runs before all tests to configure the testing environment.
 */

import { beforeAll, afterAll, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// Set test environment variables
beforeAll(() => {
  process.env.S3_REGION = "us-east-1";
  process.env.S3_ACCESS_KEY_ID = "test-access-key";
  process.env.S3_SECRET_ACCESS_KEY = "test-secret-key";
  process.env.S3_BUCKET = "test-bucket";
  process.env.S3_FORCE_PATH_STYLE = "true";
  process.env.S3_ENDPOINT = "http://localhost:9000";
  process.env.NODE_ENV = "test";
});

// Clean up after all tests
afterAll(() => {
  // Cleanup if needed
});

// Reset state before each test
beforeEach(() => {
  // Reset any shared state
});
