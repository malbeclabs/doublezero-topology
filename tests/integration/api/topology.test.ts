/**
 * Integration tests for topology API route
 * Tests the complete flow: S3 fetch → TypeScript processing → three-way comparison → health calculation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { Readable } from "stream";

// Mock S3 client module
vi.mock("@/lib/s3/client", () => {
  const { S3Client } = require("@aws-sdk/client-s3");
  return {
    s3Client: new S3Client({}),
    S3_BUCKET: "dztopo",
  };
});

const s3Mock = mockClient(S3Client);

// Helper to create mock S3 stream
function createMockS3Stream(data: string): Readable {
  const stream = new Readable();
  stream.push(data);
  stream.push(null);
  return stream;
}

describe("POST /api/topology", () => {
  beforeEach(() => {
    s3Mock.reset();
  });

  describe("Input Validation", () => {
    it("should return 400 if snapshotKey is missing", async () => {
      const { POST } = await import("@/app/api/topology/route");

      const request = new Request("http://localhost:3000/api/topology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isisKey: "isis/123-isis.json" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("snapshotKey");
    });

    it("should return 400 if isisKey is missing", async () => {
      const { POST } = await import("@/app/api/topology/route");

      const request = new Request("http://localhost:3000/api/topology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotKey: "snapshots/123-snapshot.json" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("isisKey");
    });

    it("should return 400 if request body is invalid JSON", async () => {
      const { POST } = await import("@/app/api/topology/route");

      const request = new Request("http://localhost:3000/api/topology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe("S3 File Retrieval", () => {
    it("should return 500 if snapshot file not found in S3", async () => {
      const { POST } = await import("@/app/api/topology/route");

      s3Mock.on(GetObjectCommand).rejects({
        name: "NoSuchKey",
        message: "The specified key does not exist",
      });

      const request = new Request("http://localhost:3000/api/topology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshotKey: "snapshots/nonexistent.json",
          isisKey: "isis/123-isis.json",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain("snapshot");
    });

    it("should return 500 if ISIS file not found in S3", async () => {
      const { POST } = await import("@/app/api/topology/route");

      const snapshotData = JSON.stringify({
        fetch_data: { dz_serviceability: { links: [] } },
      });

      s3Mock
        .on(GetObjectCommand, { Key: "snapshots/123-snapshot.json" })
        .resolves({ Body: createMockS3Stream(snapshotData) })
        .on(GetObjectCommand, { Key: "isis/123-isis.json" })
        .rejects({
          name: "NoSuchKey",
          message: "The specified key does not exist",
        });

      const request = new Request("http://localhost:3000/api/topology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshotKey: "snapshots/123-snapshot.json",
          isisKey: "isis/123-isis.json",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain("ISIS");
    });
  });

  describe("Topology Processing", () => {
    it("should successfully process valid files and return topology", async () => {
      const { POST } = await import("@/app/api/topology/route");

      const snapshotData = JSON.stringify({
        fetch_data: {
          dz_serviceability: {
            links: {
              link1: {
                link_pk: "link1",
                code: "dz-ch2:dz-nyc",
                side_a_device_pk: "dev-ch2",
                side_b_device_pk: "dev-nyc",
                side_a_location_pk: "CH2",
                side_b_location_pk: "NYC",
                side_a_iface_name: "eth0",
                side_b_iface_name: "eth1",
                delay_ns: 5000000,
                tunnel_net: "172.16.0.222/31",
              },
            },
            devices: {
              "dev-ch2": {
                device_pk: "dev-ch2",
                code: "dz-ch2",
                location_pk: "CH2",
              },
              "dev-nyc": {
                device_pk: "dev-nyc",
                code: "dz-nyc",
                location_pk: "NYC",
              },
            },
            locations: {
              CH2: {
                location_pk: "CH2",
                code: "CH2",
                name: "Chicago",
                lat: 41.8781,
                lng: -87.6298,
              },
              NYC: {
                location_pk: "NYC",
                code: "NYC",
                name: "New York",
                lat: 40.7128,
                lng: -74.0060,
              },
            },
          },
          dz_telemetry: {
            device_latency_samples: [
              {
                link_pk: "link1",
                samples: [4800, 5000, 5200, 4900, 5100],
              },
            ],
          },
        },
      });

      const isisData = JSON.stringify({
        vrfs: {
          default: {
            isisInstances: {
              "1": {
                level: {
                  "2": {
                    lsps: {
                      "DZ-CH2-SW01.00-00": {
                        hostname: { name: "DZ-CH2-SW01" },
                        neighbors: [
                          {
                            adjInterfaceAddresses: [
                              { adjInterfaceAddress: "172.16.0.222" },
                            ],
                            metric: 5000,
                            systemId: "DZ-NYC-SW01",
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      s3Mock
        .on(GetObjectCommand, { Key: "snapshots/123-snapshot.json" })
        .resolves({ Body: createMockS3Stream(snapshotData) })
        .on(GetObjectCommand, { Key: "isis/123-isis.json" })
        .resolves({ Body: createMockS3Stream(isisData) });

      const request = new Request("http://localhost:3000/api/topology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshotKey: "snapshots/123-snapshot.json",
          isisKey: "isis/123-isis.json",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.topology).toBeDefined();
      expect(data.data.summary).toBeDefined();
      expect(data.data.summary.total_links).toBe(1);
    });
  });

  describe("Summary Statistics", () => {
    it("should return summary statistics with topology", async () => {
      const { POST } = await import("@/app/api/topology/route");

      const snapshotData = JSON.stringify({
        fetch_data: {
          dz_serviceability: { links: {} },
          dz_telemetry: { device_latency_samples: [] },
        },
      });

      const isisData = JSON.stringify({
        vrfs: { default: { isisInstances: {} } },
      });

      s3Mock
        .on(GetObjectCommand, { Key: "snapshots/123-snapshot.json" })
        .resolves({ Body: createMockS3Stream(snapshotData) })
        .on(GetObjectCommand, { Key: "isis/123-isis.json" })
        .resolves({ Body: createMockS3Stream(isisData) });

      const request = new Request("http://localhost:3000/api/topology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshotKey: "snapshots/123-snapshot.json",
          isisKey: "isis/123-isis.json",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.summary).toBeDefined();
      expect(data.data.summary.total_links).toBe(0);
      expect(data.data.summary.healthy).toBeDefined();
    });
  });
});
