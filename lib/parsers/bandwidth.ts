/**
 * Bandwidth Parsing Utilities
 *
 * Functions for parsing, formatting, and categorizing network bandwidth values.
 * Implements support for various input formats (numeric bps, string "100G", "100GE", etc.)
 */

/**
 * Bandwidth tier values for grouping and filtering
 */
export type BandwidthTier = 0 | 10 | 50 | 100 | 200;

/**
 * Parse bandwidth from various formats to Gbps
 *
 * Supports:
 * - Numeric input (bits per second): 10000000000 → 10
 * - String formats: "100G", "100GE", "100 Gbps", "100Gbps"
 * - Megabit formats: "1000M", "1000 Mbps" → 1
 *
 * @param input - Bandwidth value (numeric bps, string, null, or undefined)
 * @returns Bandwidth in Gbps, or null if invalid/missing
 *
 * @example
 * parseBandwidthToGbps(10000000000)  // → 10
 * parseBandwidthToGbps("100G")       // → 100
 * parseBandwidthToGbps("100GE")      // → 100
 * parseBandwidthToGbps("1000 Mbps")  // → 1
 * parseBandwidthToGbps(null)         // → null
 */
export function parseBandwidthToGbps(
  input: string | number | null | undefined,
): number | null {
  if (input === null || input === undefined) {
    return null;
  }

  // If numeric, assume bits per second (bps)
  if (typeof input === "number") {
    return input / 1_000_000_000; // Convert bps to Gbps
  }

  // Parse string formats
  const str = input.toString().toLowerCase().trim();

  if (str === "") {
    return null;
  }

  // Match patterns like "100G", "100GE", "100 Gbps", "100Gbps"
  // Captures the numeric value before G/GE/Gbps
  const gbpsPattern = /(\d+(?:\.\d+)?)\s*(?:g(?:bps|e)?)/i;
  let match = str.match(gbpsPattern);
  if (match) {
    return parseFloat(match[1]);
  }

  // Match patterns like "1000M", "1000 Mbps"
  // Converts Mbps to Gbps
  const mbpsPattern = /(\d+(?:\.\d+)?)\s*(?:m(?:bps)?)/i;
  match = str.match(mbpsPattern);
  if (match) {
    return parseFloat(match[1]) / 1000; // Convert Mbps to Gbps
  }

  // No valid format matched
  return null;
}

/**
 * Format bandwidth for human-readable display
 *
 * Values >= 1 Gbps display as Gbps
 * Values < 1 Gbps display as Mbps
 *
 * @param gbps - Bandwidth in Gbps (or null)
 * @returns Formatted string (e.g., "100 Gbps", "500 Mbps", "Unknown")
 *
 * @example
 * formatBandwidth(100)    // → "100 Gbps"
 * formatBandwidth(0.5)    // → "500 Mbps"
 * formatBandwidth(null)   // → "Unknown"
 */
export function formatBandwidth(gbps: number | null): string {
  if (gbps === null) {
    return "Unknown";
  }

  if (gbps >= 1) {
    return `${gbps} Gbps`;
  } else {
    return `${gbps * 1000} Mbps`;
  }
}

/**
 * Get bandwidth tier for grouping and filtering
 *
 * Tiers based on actual dataset distribution:
 * - Tier 0: null/unknown
 * - Tier 10: < 50 Gbps (includes 10G links - 78.4% of dataset)
 * - Tier 50: 50-99 Gbps (includes 50G links - 1.1% of dataset)
 * - Tier 100: 100-199 Gbps (includes 100G links - 19.3% of dataset)
 * - Tier 200: >= 200 Gbps (includes 200G+ links - 1.1% of dataset)
 *
 * @param gbps - Bandwidth in Gbps (or null)
 * @returns Bandwidth tier (0, 10, 50, 100, or 200)
 *
 * @example
 * getBandwidthTier(10)    // → 10
 * getBandwidthTier(50)    // → 50
 * getBandwidthTier(100)   // → 100
 * getBandwidthTier(200)   // → 200
 * getBandwidthTier(null)  // → 0
 */
export function getBandwidthTier(gbps: number | null): BandwidthTier {
  if (gbps === null) {
    return 0;
  }

  if (gbps < 50) {
    return 10;
  } else if (gbps < 100) {
    return 50;
  } else if (gbps < 200) {
    return 100;
  } else {
    return 200;
  }
}

/**
 * Get human-readable label for bandwidth tier
 *
 * @param tier - Bandwidth tier (0, 10, 50, 100, or 200)
 * @returns Human-readable tier label
 *
 * @example
 * getTierLabel(10)   // → "< 50 Gbps"
 * getTierLabel(50)   // → "50-100 Gbps"
 * getTierLabel(100)  // → "100-200 Gbps"
 * getTierLabel(200)  // → "200+ Gbps"
 */
export function getTierLabel(tier: BandwidthTier): string {
  const labels: Record<BandwidthTier, string> = {
    0: "Unknown",
    10: "< 50 Gbps",
    50: "50-100 Gbps",
    100: "100-200 Gbps",
    200: "200+ Gbps",
  };
  return labels[tier];
}

/**
 * Get arc width in pixels for map visualization based on bandwidth
 *
 * Arc width mapping based on dataset distribution:
 * - 10 Gbps tier: 3px (69 links - 78.4%)
 * - 50 Gbps tier: 5px (1 link - 1.1%)
 * - 100 Gbps tier: 8px (17 links - 19.3%)
 * - 200+ Gbps tier: 10px (1 link - 1.1%)
 *
 * @param gbps - Bandwidth in Gbps (or null)
 * @returns Arc width in pixels (default 3px for unknown)
 *
 * @example
 * getArcWidth(10)    // → 3
 * getArcWidth(50)    // → 5
 * getArcWidth(100)   // → 8
 * getArcWidth(200)   // → 10
 * getArcWidth(null)  // → 3
 */
export function getArcWidth(gbps: number | null): number {
  const tier = getBandwidthTier(gbps);

  const widthMap: Record<BandwidthTier, number> = {
    0: 3, // Unknown - default width
    10: 3, // < 50 Gbps
    50: 5, // 50-100 Gbps
    100: 8, // 100-200 Gbps
    200: 10, // 200+ Gbps
  };

  return widthMap[tier];
}
