/**
 * Filter Links Utility
 *
 * Applies map filter state to topology links
 */

import type { TopologyLink, HealthStatus, DataCompleteness } from "@/types/topology";
import { getBandwidthTier } from "@/lib/parsers/bandwidth";

interface FilterCriteria {
  bandwidthTiers: Set<number>;
  healthStatuses: Set<HealthStatus>;
  driftRange: { min: number; max: number };
  dataStatuses: Set<DataCompleteness>;
  searchQuery: string;
}

/**
 * Filter topology links based on filter criteria
 *
 * INVERTED LOGIC (industry standard):
 * - Empty Set/null = show ALL
 * - Populated Set = show ONLY selected items
 *
 * All filters use AND logic - a link must pass all active filters to be included
 */
export function filterLinks(
  links: TopologyLink[],
  filters: FilterCriteria
): TopologyLink[] {
  return links.filter(link => {
    // Bandwidth tier filter (INVERTED: empty = show all, populated = show only selected)
    if (filters.bandwidthTiers.size > 0) {
      const tier = getBandwidthTier(link.bandwidth_gbps);
      if (!filters.bandwidthTiers.has(tier)) {
        return false;
      }
    }

    // Health status filter (INVERTED: empty = show all, populated = show only selected)
    if (filters.healthStatuses.size > 0) {
      if (!filters.healthStatuses.has(link.health_status)) {
        return false;
      }
    }

    // Drift range filter (only applies to links with drift data)
    const isDriftRangeModified = filters.driftRange.min !== 0 || filters.driftRange.max !== 100;
    if (isDriftRangeModified && link.drift_pct !== null) {
      if (link.drift_pct < filters.driftRange.min || link.drift_pct > filters.driftRange.max) {
        return false;
      }
    }

    // Data completeness filter (INVERTED: empty = show all, populated = show only selected)
    if (filters.dataStatuses.size > 0) {
      if (!filters.dataStatuses.has(link.data_status)) {
        return false;
      }
    }

    // Search query filter (case-insensitive, searches link code and device codes)
    if (filters.searchQuery.trim() !== "") {
      const query = filters.searchQuery.toLowerCase();
      const matchesLinkCode = link.link_code.toLowerCase().includes(query);
      const matchesDeviceA = link.device_a_code.toLowerCase().includes(query);
      const matchesDeviceZ = link.device_z_code.toLowerCase().includes(query);
      const matchesLocationA = link.device_a_location_name.toLowerCase().includes(query);
      const matchesLocationZ = link.device_z_location_name.toLowerCase().includes(query);

      if (!matchesLinkCode && !matchesDeviceA && !matchesDeviceZ && !matchesLocationA && !matchesLocationZ) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculate filter statistics
 */
export function calculateFilterStats(
  allLinks: TopologyLink[],
  filteredLinks: TopologyLink[]
): {
  visibleLinks: number;
  totalLinks: number;
  hiddenLinks: number;
  percentageVisible: number;
} {
  const visibleLinks = filteredLinks.length;
  const totalLinks = allLinks.length;
  const hiddenLinks = totalLinks - visibleLinks;
  const percentageVisible = totalLinks > 0 ? (visibleLinks / totalLinks) * 100 : 0;

  return {
    visibleLinks,
    totalLinks,
    hiddenLinks,
    percentageVisible,
  };
}
