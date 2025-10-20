import { describe, it, expect } from "vitest";
import { buildTopologyGraph } from "@/lib/graph/topology-graph";
import type { TopologyLink } from "@/types/topology";
import type { WeightingStrategy } from "@/lib/graph/types";

/**
 * Sample topology links for testing
 */
const sampleLinks: TopologyLink[] = [
  {
    link_pk: "link-1",
    link_code: "device-a:device-b",
    device_a_code: "device-a",
    device_z_code: "device-b",
    device_a_lat: 34.0522,
    device_a_lon: -118.2437,
    device_a_location_name: "Los Angeles",
    device_a_location_code: "LA",
    device_a_country: "US",
    device_z_lat: 40.7128,
    device_z_lon: -74.006,
    device_z_location_name: "New York",
    device_z_location_code: "NY",
    device_z_country: "US",
    side_a_iface_name: "eth0",
    side_b_iface_name: "eth0",
    expected_delay_ns: 70000000,
    expected_delay_us: 70000,
    bandwidth_bps: 100000000000,
    bandwidth_gbps: 100,
    bandwidth_label: "100 Gbps",
    bandwidth_tier: 100,
    measured_p50_us: 71000,
    measured_p90_us: 72000,
    measured_p95_us: 73000,
    measured_p99_us: 75000,
    telemetry_sample_count: 1000,
    isis_metric: 70,
    isis_interface_name: "eth0",
    drift_pct: 1.43,
    health_status: "HEALTHY",
    data_status: "COMPLETE",
    has_serviceability: true,
    has_telemetry: true,
    has_isis: true,
  },
  {
    link_pk: "link-2",
    link_code: "device-b:device-c",
    device_a_code: "device-b",
    device_z_code: "device-c",
    device_a_lat: 40.7128,
    device_a_lon: -74.006,
    device_a_location_name: "New York",
    device_a_location_code: "NY",
    device_a_country: "US",
    device_z_lat: 51.5074,
    device_z_lon: -0.1278,
    device_z_location_name: "London",
    device_z_location_code: "LON",
    device_z_country: "GB",
    side_a_iface_name: "eth1",
    side_b_iface_name: "eth0",
    expected_delay_ns: 50000000,
    expected_delay_us: 50000,
    bandwidth_bps: 50000000000,
    bandwidth_gbps: 50,
    bandwidth_label: "50 Gbps",
    bandwidth_tier: 50,
    measured_p50_us: 52000,
    measured_p90_us: 53000,
    measured_p95_us: 54000,
    measured_p99_us: 56000,
    telemetry_sample_count: 800,
    isis_metric: 50,
    isis_interface_name: "eth1",
    drift_pct: 4.0,
    health_status: "HEALTHY",
    data_status: "COMPLETE",
    has_serviceability: true,
    has_telemetry: true,
    has_isis: true,
  },
  {
    link_pk: "link-3",
    link_code: "device-a:device-c",
    device_a_code: "device-a",
    device_z_code: "device-c",
    device_a_lat: 34.0522,
    device_a_lon: -118.2437,
    device_a_location_name: "Los Angeles",
    device_a_location_code: "LA",
    device_a_country: "US",
    device_z_lat: 51.5074,
    device_z_lon: -0.1278,
    device_z_location_name: "London",
    device_z_location_code: "LON",
    device_z_country: "GB",
    side_a_iface_name: "eth2",
    side_b_iface_name: "eth1",
    expected_delay_ns: 120000000,
    expected_delay_us: 120000,
    bandwidth_bps: 200000000000,
    bandwidth_gbps: 200,
    bandwidth_label: "200 Gbps",
    bandwidth_tier: 200,
    measured_p50_us: null,
    measured_p90_us: null,
    measured_p95_us: null,
    measured_p99_us: null,
    telemetry_sample_count: null,
    isis_metric: 120,
    isis_interface_name: "eth2",
    drift_pct: null,
    health_status: "MISSING_TELEMETRY",
    data_status: "MISSING_TELEMETRY",
    has_serviceability: true,
    has_telemetry: false,
    has_isis: true,
  },
];

describe("buildTopologyGraph", () => {
  describe("Graph Structure", () => {
    it("should build graph from topology links", () => {
      const graph = buildTopologyGraph(sampleLinks, "latency");

      // Should have 3 nodes (device-a, device-b, device-c)
      expect(graph.nodes.size).toBe(3);

      // Should have 3 edges
      expect(graph.edges.size).toBe(3);

      // Should have adjacency list entries for all nodes
      expect(graph.adjacencyList.size).toBe(3);
    });

    it("should create nodes with correct properties", () => {
      const graph = buildTopologyGraph(sampleLinks, "latency");

      const nodeA = graph.nodes.get("device-a");
      expect(nodeA).toBeDefined();
      expect(nodeA?.id).toBe("device-a");
      expect(nodeA?.type).toBe("device");
      expect(nodeA?.name).toBe("device-a");
      expect(nodeA?.latitude).toBe(34.0522);
      expect(nodeA?.longitude).toBe(-118.2437);
    });

    it("should create edges with correct properties", () => {
      const graph = buildTopologyGraph(sampleLinks, "latency");

      const edge1 = graph.edges.get("link-1");
      expect(edge1).toBeDefined();
      expect(edge1?.id).toBe("link-1");
      expect(edge1?.source).toBe("device-a");
      expect(edge1?.target).toBe("device-b");
      expect(edge1?.latencyUs).toBe(73000); // Uses measured_p95_us
      expect(edge1?.bandwidthGbps).toBe(100);
      expect(edge1?.healthStatus).toBe("HEALTHY");
      expect(edge1?.bidirectional).toBe(true);
    });

    it("should create bidirectional adjacency list", () => {
      const graph = buildTopologyGraph(sampleLinks, "latency");

      // device-a should have neighbors: device-b, device-c
      const neighborsA = graph.adjacencyList.get("device-a");
      expect(neighborsA).toBeDefined();
      expect(neighborsA).toContain("device-b");
      expect(neighborsA).toContain("device-c");

      // device-b should have neighbors: device-a, device-c
      const neighborsB = graph.adjacencyList.get("device-b");
      expect(neighborsB).toBeDefined();
      expect(neighborsB).toContain("device-a");
      expect(neighborsB).toContain("device-c");

      // device-c should have neighbors: device-a, device-b
      const neighborsC = graph.adjacencyList.get("device-c");
      expect(neighborsC).toBeDefined();
      expect(neighborsC).toContain("device-a");
      expect(neighborsC).toContain("device-b");
    });

    it("should handle empty link array", () => {
      const graph = buildTopologyGraph([], "latency");

      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.size).toBe(0);
      expect(graph.adjacencyList.size).toBe(0);
    });
  });

  describe("Weighting Strategies", () => {
    it("should calculate latency-based weights using measured P95", () => {
      const graph = buildTopologyGraph(sampleLinks, "latency");

      const edge1 = graph.edges.get("link-1");
      expect(edge1?.weight).toBe(73000); // measured_p95_us

      const edge2 = graph.edges.get("link-2");
      expect(edge2?.weight).toBe(54000); // measured_p95_us
    });

    it("should fallback to expected delay when no telemetry", () => {
      const graph = buildTopologyGraph(sampleLinks, "latency");

      const edge3 = graph.edges.get("link-3");
      expect(edge3?.weight).toBe(120000); // expected_delay_us (no telemetry)
    });

    it("should calculate hop-count weights as uniform 1", () => {
      const graph = buildTopologyGraph(sampleLinks, "hops");

      const edge1 = graph.edges.get("link-1");
      expect(edge1?.weight).toBe(1);

      const edge2 = graph.edges.get("link-2");
      expect(edge2?.weight).toBe(1);

      const edge3 = graph.edges.get("link-3");
      expect(edge3?.weight).toBe(1);
    });

    it("should calculate bandwidth-based weights (inverted)", () => {
      const graph = buildTopologyGraph(sampleLinks, "bandwidth");

      const edge1 = graph.edges.get("link-1");
      expect(edge1?.weight).toBe(1 / 100); // 1 / 100 Gbps = 0.01

      const edge2 = graph.edges.get("link-2");
      expect(edge2?.weight).toBe(1 / 50); // 1 / 50 Gbps = 0.02

      const edge3 = graph.edges.get("link-3");
      expect(edge3?.weight).toBe(1 / 200); // 1 / 200 Gbps = 0.005
    });

    it("should calculate ISIS metric weights", () => {
      const graph = buildTopologyGraph(sampleLinks, "isis-metric");

      const edge1 = graph.edges.get("link-1");
      expect(edge1?.weight).toBe(70);

      const edge2 = graph.edges.get("link-2");
      expect(edge2?.weight).toBe(50);

      const edge3 = graph.edges.get("link-3");
      expect(edge3?.weight).toBe(120);
    });

    it("should calculate combined weights (70% latency + 30% bandwidth)", () => {
      const graph = buildTopologyGraph(sampleLinks, "combined");

      const edge1 = graph.edges.get("link-1");
      const expectedWeight1 = 0.7 * 73000 + 0.3 * (1 / 100) * 1000000;
      expect(edge1?.weight).toBeCloseTo(expectedWeight1, 2);

      const edge2 = graph.edges.get("link-2");
      const expectedWeight2 = 0.7 * 54000 + 0.3 * (1 / 50) * 1000000;
      expect(edge2?.weight).toBeCloseTo(expectedWeight2, 2);
    });

    it("should use fallback weight of 10000 for ISIS metric when null", () => {
      const linkWithoutIsis: TopologyLink = {
        ...sampleLinks[0],
        link_pk: "link-no-isis",
        isis_metric: null,
        isis_interface_name: null,
      };

      const graph = buildTopologyGraph([linkWithoutIsis], "isis-metric");
      const edge = graph.edges.get("link-no-isis");

      expect(edge?.weight).toBe(10000);
    });

    it("should use fallback bandwidth of 10 Gbps when null", () => {
      const linkWithoutBandwidth: TopologyLink = {
        ...sampleLinks[0],
        link_pk: "link-no-bw",
        bandwidth_gbps: null,
        bandwidth_bps: null,
      };

      const graph = buildTopologyGraph([linkWithoutBandwidth], "bandwidth");
      const edge = graph.edges.get("link-no-bw");

      expect(edge?.weight).toBe(1 / 10); // 1 / 10 Gbps fallback
    });
  });

  describe("Edge Cases", () => {
    it("should handle single link", () => {
      const graph = buildTopologyGraph([sampleLinks[0]], "latency");

      expect(graph.nodes.size).toBe(2); // device-a and device-b
      expect(graph.edges.size).toBe(1);
      expect(graph.adjacencyList.get("device-a")).toEqual(["device-b"]);
      expect(graph.adjacencyList.get("device-b")).toEqual(["device-a"]);
    });

    it("should deduplicate nodes from multiple links", () => {
      // All sample links share some devices
      const graph = buildTopologyGraph(sampleLinks, "latency");

      // Should only have 3 unique nodes despite 3 links
      expect(graph.nodes.size).toBe(3);
    });

    it("should handle links with missing coordinates (should not crash)", () => {
      const linkWithoutCoords: TopologyLink = {
        ...sampleLinks[0],
        link_pk: "link-no-coords",
        device_a_lat: 0,
        device_a_lon: 0,
        device_z_lat: 0,
        device_z_lon: 0,
      };

      const graph = buildTopologyGraph([linkWithoutCoords], "latency");

      expect(graph.nodes.size).toBe(2);
      const nodeA = Array.from(graph.nodes.values())[0];
      expect(nodeA.latitude).toBe(0);
      expect(nodeA.longitude).toBe(0);
    });

    it("should use consistent node IDs based on device codes", () => {
      const graph = buildTopologyGraph(sampleLinks, "latency");

      // Node IDs should be device codes
      expect(graph.nodes.has("device-a")).toBe(true);
      expect(graph.nodes.has("device-b")).toBe(true);
      expect(graph.nodes.has("device-c")).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should handle large graph efficiently", () => {
      // Create 100 links connecting 50 devices
      const largeLinks: TopologyLink[] = [];
      for (let i = 0; i < 100; i++) {
        largeLinks.push({
          ...sampleLinks[0],
          link_pk: `link-${i}`,
          device_a_code: `device-${i % 50}`,
          device_z_code: `device-${(i + 1) % 50}`,
        });
      }

      const startTime = performance.now();
      const graph = buildTopologyGraph(largeLinks, "latency");
      const duration = performance.now() - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(100); // < 100ms

      // Should have correct structure
      expect(graph.edges.size).toBe(100);
      expect(graph.nodes.size).toBe(50);
    });
  });
});
