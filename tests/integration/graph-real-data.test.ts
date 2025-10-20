/**
 * Integration tests for graph construction with real topology data
 *
 * These tests verify that the graph construction works correctly with
 * the sample topology data files (isis-db.json and mn-epoch-34-snapshot.json).
 */

import { describe, it, expect } from "vitest";
import { buildTopologyGraph } from "@/lib/graph/topology-graph";
import type { TopologyLink } from "@/types/topology";

/**
 * Mock topology data based on the sample dataset
 *
 * The real sample data has 88 links, so we'll create a representative subset
 * for testing purposes.
 */
const mockRealTopologyLinks: TopologyLink[] = [
  {
    link_pk: "real-link-1",
    link_code: "dz-ams-01:dz-fra-01",
    device_a_code: "dz-ams-01",
    device_z_code: "dz-fra-01",
    device_a_lat: 52.3676,
    device_a_lon: 4.9041,
    device_a_location_name: "Amsterdam",
    device_a_location_code: "AMS",
    device_a_country: "NL",
    device_z_lat: 50.1109,
    device_z_lon: 8.6821,
    device_z_location_name: "Frankfurt",
    device_z_location_code: "FRA",
    device_z_country: "DE",
    side_a_iface_name: "Ethernet1",
    side_b_iface_name: "Ethernet1",
    expected_delay_ns: 5500000,
    expected_delay_us: 5500,
    bandwidth_bps: 100000000000,
    bandwidth_gbps: 100,
    bandwidth_label: "100 Gbps",
    bandwidth_tier: 100,
    measured_p50_us: 5420,
    measured_p90_us: 5580,
    measured_p95_us: 5620,
    measured_p99_us: 5750,
    telemetry_sample_count: 1200,
    isis_metric: 6,
    isis_interface_name: "Ethernet1",
    drift_pct: 2.2,
    health_status: "HEALTHY",
    data_status: "COMPLETE",
    has_serviceability: true,
    has_telemetry: true,
    has_isis: true,
  },
  {
    link_pk: "real-link-2",
    link_code: "dz-fra-01:dz-lon-01",
    device_a_code: "dz-fra-01",
    device_z_code: "dz-lon-01",
    device_a_lat: 50.1109,
    device_a_lon: 8.6821,
    device_a_location_name: "Frankfurt",
    device_a_location_code: "FRA",
    device_a_country: "DE",
    device_z_lat: 51.5074,
    device_z_lon: -0.1278,
    device_z_location_name: "London",
    device_z_location_code: "LON",
    device_z_country: "GB",
    side_a_iface_name: "Ethernet2",
    side_b_iface_name: "Ethernet1",
    expected_delay_ns: 8200000,
    expected_delay_us: 8200,
    bandwidth_bps: 100000000000,
    bandwidth_gbps: 100,
    bandwidth_label: "100 Gbps",
    bandwidth_tier: 100,
    measured_p50_us: 8340,
    measured_p90_us: 8520,
    measured_p95_us: 8590,
    measured_p99_us: 8780,
    telemetry_sample_count: 1150,
    isis_metric: 8,
    isis_interface_name: "Ethernet2",
    drift_pct: 4.8,
    health_status: "HEALTHY",
    data_status: "COMPLETE",
    has_serviceability: true,
    has_telemetry: true,
    has_isis: true,
  },
  {
    link_pk: "real-link-3",
    link_code: "dz-lon-01:dz-nyc-01",
    device_a_code: "dz-lon-01",
    device_z_code: "dz-nyc-01",
    device_a_lat: 51.5074,
    device_a_lon: -0.1278,
    device_a_location_name: "London",
    device_a_location_code: "LON",
    device_a_country: "GB",
    device_z_lat: 40.7128,
    device_z_lon: -74.006,
    device_z_location_name: "New York",
    device_z_location_code: "NYC",
    device_z_country: "US",
    side_a_iface_name: "Ethernet3",
    side_b_iface_name: "Ethernet1",
    expected_delay_ns: 28000000,
    expected_delay_us: 28000,
    bandwidth_bps: 100000000000,
    bandwidth_gbps: 100,
    bandwidth_label: "100 Gbps",
    bandwidth_tier: 100,
    measured_p50_us: null,
    measured_p90_us: null,
    measured_p95_us: null,
    measured_p99_us: null,
    telemetry_sample_count: null,
    isis_metric: 28,
    isis_interface_name: "Ethernet3",
    drift_pct: null,
    health_status: "MISSING_TELEMETRY",
    data_status: "MISSING_TELEMETRY",
    has_serviceability: true,
    has_telemetry: false,
    has_isis: true,
  },
];

describe("Graph Construction with Real Data", () => {
  it("should build graph from realistic topology data", () => {
    const graph = buildTopologyGraph(mockRealTopologyLinks, "latency");

    // Verify graph structure
    expect(graph.nodes.size).toBe(4); // Amsterdam, Frankfurt, London, New York
    expect(graph.edges.size).toBe(3);
    expect(graph.adjacencyList.size).toBe(4);
  });

  it("should create nodes with correct geographic coordinates", () => {
    const graph = buildTopologyGraph(mockRealTopologyLinks, "latency");

    const amsterdamNode = graph.nodes.get("dz-ams-01");
    expect(amsterdamNode).toBeDefined();
    expect(amsterdamNode?.latitude).toBeCloseTo(52.3676, 4);
    expect(amsterdamNode?.longitude).toBeCloseTo(4.9041, 4);

    const nycNode = graph.nodes.get("dz-nyc-01");
    expect(nycNode).toBeDefined();
    expect(nycNode?.latitude).toBeCloseTo(40.7128, 4);
    expect(nycNode?.longitude).toBeCloseTo(-74.006, 4);
  });

  it("should handle mixed data completeness (some missing telemetry)", () => {
    const graph = buildTopologyGraph(mockRealTopologyLinks, "latency");

    // Link with telemetry should use measured P95
    const edge1 = graph.edges.get("real-link-1");
    expect(edge1?.latencyUs).toBe(5620);
    expect(edge1?.weight).toBe(5620);

    // Link without telemetry should use expected delay
    const edge3 = graph.edges.get("real-link-3");
    expect(edge3?.latencyUs).toBe(28000);
    expect(edge3?.weight).toBe(28000);
  });

  it("should create correct adjacency relationships", () => {
    const graph = buildTopologyGraph(mockRealTopologyLinks, "latency");

    // Amsterdam should connect to Frankfurt
    const amsNeighbors = graph.adjacencyList.get("dz-ams-01");
    expect(amsNeighbors).toContain("dz-fra-01");

    // Frankfurt should connect to Amsterdam and London
    const fraNeighbors = graph.adjacencyList.get("dz-fra-01");
    expect(fraNeighbors).toContain("dz-ams-01");
    expect(fraNeighbors).toContain("dz-lon-01");

    // New York should connect to London
    const nycNeighbors = graph.adjacencyList.get("dz-nyc-01");
    expect(nycNeighbors).toContain("dz-lon-01");
  });

  it("should handle all weighting strategies with real data", () => {
    // Latency strategy
    const graphLatency = buildTopologyGraph(mockRealTopologyLinks, "latency");
    const edge1Latency = graphLatency.edges.get("real-link-1");
    expect(edge1Latency?.weight).toBe(5620);

    // Hops strategy
    const graphHops = buildTopologyGraph(mockRealTopologyLinks, "hops");
    const edge1Hops = graphHops.edges.get("real-link-1");
    expect(edge1Hops?.weight).toBe(1);

    // Bandwidth strategy
    const graphBandwidth = buildTopologyGraph(mockRealTopologyLinks, "bandwidth");
    const edge1Bandwidth = graphBandwidth.edges.get("real-link-1");
    expect(edge1Bandwidth?.weight).toBe(1 / 100);

    // ISIS metric strategy
    const graphIsis = buildTopologyGraph(mockRealTopologyLinks, "isis-metric");
    const edge1Isis = graphIsis.edges.get("real-link-1");
    expect(edge1Isis?.weight).toBe(6);

    // Combined strategy
    const graphCombined = buildTopologyGraph(mockRealTopologyLinks, "combined");
    const edge1Combined = graphCombined.edges.get("real-link-1");
    const expectedCombined = 0.7 * 5620 + 0.3 * (1 / 100) * 1000000;
    expect(edge1Combined?.weight).toBeCloseTo(expectedCombined, 2);
  });

  it("should maintain metadata in nodes and edges", () => {
    const graph = buildTopologyGraph(mockRealTopologyLinks, "latency");

    const node = graph.nodes.get("dz-ams-01");
    expect(node?.metadata).toBeDefined();
    expect(node?.metadata).toHaveProperty("location_name", "Amsterdam");

    const edge = graph.edges.get("real-link-1");
    expect(edge?.metadata).toBeDefined();
    expect((edge?.metadata as TopologyLink).link_code).toBe("dz-ams-01:dz-fra-01");
  });

  it("should handle performance with realistic dataset size", () => {
    // Simulate 88 links (the actual dataset size)
    const largeDataset: TopologyLink[] = [];
    for (let i = 0; i < 88; i++) {
      largeDataset.push({
        ...mockRealTopologyLinks[i % 3],
        link_pk: `link-${i}`,
        device_a_code: `device-${Math.floor(i / 2)}`,
        device_z_code: `device-${Math.floor(i / 2) + 1}`,
      });
    }

    const startTime = performance.now();
    const graph = buildTopologyGraph(largeDataset, "latency");
    const duration = performance.now() - startTime;

    // Should complete quickly
    expect(duration).toBeLessThan(50); // < 50ms for 88 links

    // Verify correct structure
    expect(graph.edges.size).toBe(88);
  });
});
