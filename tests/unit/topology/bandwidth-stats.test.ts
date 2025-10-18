/**
 * Unit tests for bandwidth statistics calculations
 * Following TDD: Tests written before implementation
 */

import { describe, it, expect } from "vitest";
import { calculateBandwidthStats } from "@/lib/topology/bandwidth-stats";
import type { TopologyLink } from "@/types/topology";

// Helper to create mock topology link
function createMockLink(
  linkPk: string,
  bandwidthGbps: number | null,
): Partial<TopologyLink> {
  return {
    link_pk: linkPk,
    bandwidth_gbps: bandwidthGbps,
    bandwidth_bps: bandwidthGbps ? bandwidthGbps * 1_000_000_000 : null,
  };
}

describe("calculateBandwidthStats", () => {
  it("should calculate correct stats for dataset with 10G, 50G, 100G, 200G links", () => {
    const links: Partial<TopologyLink>[] = [
      // 69 links at 10 Gbps
      ...Array(69)
        .fill(null)
        .map((_, i) => createMockLink(`link-10g-${i}`, 10)),
      // 1 link at 50 Gbps
      createMockLink("link-50g-0", 50),
      // 17 links at 100 Gbps
      ...Array(17)
        .fill(null)
        .map((_, i) => createMockLink(`link-100g-${i}`, 100)),
      // 1 link at 200 Gbps
      createMockLink("link-200g-0", 200),
    ];

    const stats = calculateBandwidthStats(
      links as TopologyLink[],
    );

    // Total capacity: (69 * 10) + (1 * 50) + (17 * 100) + (1 * 200) = 2,640 Gbps
    expect(stats.total_capacity_gbps).toBe(2640);

    // Average: 2,640 / 88 = 30
    expect(stats.average_bandwidth_gbps).toBe(30);

    // Distribution by tier
    expect(stats.distribution[10]).toBe(69); // < 50 Gbps tier
    expect(stats.distribution[50]).toBe(1); // 50-100 Gbps tier
    expect(stats.distribution[100]).toBe(17); // 100-200 Gbps tier
    expect(stats.distribution[200]).toBe(1); // 200+ Gbps tier

    // links_by_tier should match distribution
    expect(stats.links_by_tier[10]).toBe(69);
    expect(stats.links_by_tier[50]).toBe(1);
    expect(stats.links_by_tier[100]).toBe(17);
    expect(stats.links_by_tier[200]).toBe(1);
  });

  it("should handle empty link array", () => {
    const links: TopologyLink[] = [];
    const stats = calculateBandwidthStats(links);

    expect(stats.total_capacity_gbps).toBe(0);
    expect(stats.average_bandwidth_gbps).toBe(0);
    expect(stats.distribution).toEqual({});
    expect(stats.links_by_tier).toEqual({});
  });

  it("should handle links with null bandwidth", () => {
    const links: Partial<TopologyLink>[] = [
      createMockLink("link-1", 100),
      createMockLink("link-2", null),
      createMockLink("link-3", 50),
      createMockLink("link-4", null),
    ];

    const stats = calculateBandwidthStats(
      links as TopologyLink[],
    );

    // Only count links with valid bandwidth: 100 + 50 = 150
    expect(stats.total_capacity_gbps).toBe(150);

    // Average of valid links: 150 / 2 = 75
    expect(stats.average_bandwidth_gbps).toBe(75);

    // Distribution should only count valid links
    expect(stats.distribution[50]).toBe(1); // 50 Gbps
    expect(stats.distribution[100]).toBe(1); // 100 Gbps
    expect(stats.distribution[0]).toBeUndefined(); // No tier 0 counted
  });

  it("should handle all links with null bandwidth", () => {
    const links: Partial<TopologyLink>[] = [
      createMockLink("link-1", null),
      createMockLink("link-2", null),
    ];

    const stats = calculateBandwidthStats(
      links as TopologyLink[],
    );

    expect(stats.total_capacity_gbps).toBe(0);
    expect(stats.average_bandwidth_gbps).toBe(0);
    expect(Object.keys(stats.distribution)).toHaveLength(0);
  });

  it("should correctly tier links at boundaries", () => {
    const links: Partial<TopologyLink>[] = [
      createMockLink("link-1", 1), // Tier 10
      createMockLink("link-2", 49), // Tier 10
      createMockLink("link-3", 50), // Tier 50
      createMockLink("link-4", 99), // Tier 50
      createMockLink("link-5", 100), // Tier 100
      createMockLink("link-6", 199), // Tier 100
      createMockLink("link-7", 200), // Tier 200
      createMockLink("link-8", 400), // Tier 200
    ];

    const stats = calculateBandwidthStats(
      links as TopologyLink[],
    );

    expect(stats.distribution[10]).toBe(2); // 1G, 49G
    expect(stats.distribution[50]).toBe(2); // 50G, 99G
    expect(stats.distribution[100]).toBe(2); // 100G, 199G
    expect(stats.distribution[200]).toBe(2); // 200G, 400G
  });

  it("should handle fractional bandwidth values", () => {
    const links: Partial<TopologyLink>[] = [
      createMockLink("link-1", 2.5),
      createMockLink("link-2", 10.5),
      createMockLink("link-3", 125.75),
    ];

    const stats = calculateBandwidthStats(
      links as TopologyLink[],
    );

    // Total: 2.5 + 10.5 + 125.75 = 138.75
    expect(stats.total_capacity_gbps).toBe(138.75);

    // Average: 138.75 / 3 = 46.25
    expect(stats.average_bandwidth_gbps).toBeCloseTo(46.25, 2);

    // Distribution
    expect(stats.distribution[10]).toBe(2); // 2.5G, 10.5G (both < 50)
    expect(stats.distribution[100]).toBe(1); // 125.75G (100-200 tier)
  });

  it("should handle single link", () => {
    const links: Partial<TopologyLink>[] = [
      createMockLink("link-1", 100),
    ];

    const stats = calculateBandwidthStats(
      links as TopologyLink[],
    );

    expect(stats.total_capacity_gbps).toBe(100);
    expect(stats.average_bandwidth_gbps).toBe(100);
    expect(stats.distribution[100]).toBe(1);
    expect(Object.keys(stats.distribution)).toHaveLength(1);
  });

  it("should handle large dataset efficiently", () => {
    // Create 1000 links
    const links: Partial<TopologyLink>[] = Array(1000)
      .fill(null)
      .map((_, i) => createMockLink(`link-${i}`, 100));

    const stats = calculateBandwidthStats(
      links as TopologyLink[],
    );

    expect(stats.total_capacity_gbps).toBe(100000); // 1000 * 100
    expect(stats.average_bandwidth_gbps).toBe(100);
    expect(stats.distribution[100]).toBe(1000);
  });

  it("should handle mixed tier distribution", () => {
    const links: Partial<TopologyLink>[] = [
      ...Array(10)
        .fill(null)
        .map((_, i) => createMockLink(`link-10g-${i}`, 10)),
      ...Array(20)
        .fill(null)
        .map((_, i) => createMockLink(`link-50g-${i}`, 50)),
      ...Array(30)
        .fill(null)
        .map((_, i) => createMockLink(`link-100g-${i}`, 100)),
      ...Array(40)
        .fill(null)
        .map((_, i) => createMockLink(`link-200g-${i}`, 200)),
    ];

    const stats = calculateBandwidthStats(
      links as TopologyLink[],
    );

    // Total: (10*10) + (20*50) + (30*100) + (40*200) = 12,100
    expect(stats.total_capacity_gbps).toBe(12100);

    // Average: 12,100 / 100 = 121
    expect(stats.average_bandwidth_gbps).toBe(121);

    expect(stats.distribution[10]).toBe(10);
    expect(stats.distribution[50]).toBe(20);
    expect(stats.distribution[100]).toBe(30);
    expect(stats.distribution[200]).toBe(40);
  });

  it("should calculate correct stats for real dataset snapshot", () => {
    // Real data from mn-epoch-34-snapshot.json
    const links: Partial<TopologyLink>[] = [
      ...Array(69)
        .fill(null)
        .map((_, i) => createMockLink(`10g-${i}`, 10)),
      createMockLink("50g", 50),
      ...Array(17)
        .fill(null)
        .map((_, i) => createMockLink(`100g-${i}`, 100)),
      createMockLink("200g", 200),
    ];

    const stats = calculateBandwidthStats(
      links as TopologyLink[],
    );

    // Match expected values from investigation (corrected)
    expect(stats.total_capacity_gbps).toBe(2640);
    expect(stats.average_bandwidth_gbps).toBe(30);
    expect(stats.distribution[10]).toBe(69);
    expect(stats.distribution[50]).toBe(1);
    expect(stats.distribution[100]).toBe(17);
    expect(stats.distribution[200]).toBe(1);
  });
});
