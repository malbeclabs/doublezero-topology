/**
 * Bandwidth Statistics Calculations
 *
 * Functions for calculating network capacity statistics from topology links.
 */

import type { TopologyLink, BandwidthStats } from "@/types/topology";
import { getBandwidthTier } from "@/lib/parsers/bandwidth";

/**
 * Calculate bandwidth statistics from topology links
 *
 * Computes total capacity, average bandwidth, and distribution by tier.
 *
 * @param links - Array of topology links
 * @returns Bandwidth statistics summary
 *
 * @example
 * const stats = calculateBandwidthStats(links);
 * // {
 * //   total_capacity_gbps: 2140,
 * //   average_bandwidth_gbps: 24.32,
 * //   distribution: { 10: 69, 50: 1, 100: 17, 200: 1 },
 * //   links_by_tier: { 10: 69, 50: 1, 100: 17, 200: 1 }
 * // }
 */
export function calculateBandwidthStats(
  links: TopologyLink[],
): BandwidthStats {
  const distribution: Record<number, number> = {};
  let totalCapacityGbps = 0;
  let validLinkCount = 0;

  // Iterate through all links and accumulate statistics
  for (const link of links) {
    const gbps = link.bandwidth_gbps;

    // Skip links with null/undefined bandwidth
    if (gbps === null || gbps === undefined) {
      continue;
    }

    // Add to total capacity
    totalCapacityGbps += gbps;
    validLinkCount++;

    // Get tier and increment count
    const tier = getBandwidthTier(gbps);

    // Skip tier 0 (null bandwidth) in distribution
    if (tier === 0) {
      continue;
    }

    distribution[tier] = (distribution[tier] || 0) + 1;
  }

  // Calculate average bandwidth
  const averageBandwidthGbps =
    validLinkCount > 0 ? totalCapacityGbps / validLinkCount : 0;

  return {
    total_capacity_gbps: totalCapacityGbps,
    average_bandwidth_gbps: averageBandwidthGbps,
    distribution,
    links_by_tier: distribution, // Alias for compatibility
  };
}

/**
 * Get links filtered by bandwidth tier
 *
 * @param links - Array of topology links
 * @param tier - Bandwidth tier (10, 50, 100, or 200)
 * @returns Links matching the specified tier
 *
 * @example
 * const links100G = getLinksByTier(links, 100);
 * // Returns all links in the 100-200 Gbps range
 */
export function getLinksByTier(
  links: TopologyLink[],
  tier: number,
): TopologyLink[] {
  return links.filter((link) => {
    const linkTier = getBandwidthTier(link.bandwidth_gbps);
    return linkTier === tier;
  });
}

/**
 * Get links filtered by multiple bandwidth tiers
 *
 * @param links - Array of topology links
 * @param tiers - Array of bandwidth tiers to include
 * @returns Links matching any of the specified tiers
 *
 * @example
 * const highCapacityLinks = getLinksByTiers(links, [100, 200]);
 * // Returns all links >= 100 Gbps
 */
export function getLinksByTiers(
  links: TopologyLink[],
  tiers: number[],
): TopologyLink[] {
  const tierSet = new Set(tiers);
  return links.filter((link) => {
    const linkTier = getBandwidthTier(link.bandwidth_gbps);
    return tierSet.has(linkTier);
  });
}
