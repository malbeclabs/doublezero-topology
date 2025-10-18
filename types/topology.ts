/**
 * Topology Type Definitions
 *
 * TypeScript types for DoubleZero network topology data structures.
 */

/**
 * Health status for a network link
 * Based on dzmon-py reference implementation
 */
export type HealthStatus =
  | "HEALTHY" // < 10% drift between expected and measured delay
  | "DRIFT_HIGH" // >= 10% drift
  | "MISSING_TELEMETRY" // No telemetry data available
  | "MISSING_ISIS"; // No IS-IS data available

/**
 * Data completeness status for a network link
 * Indicates which data sources are available for the link
 */
export type DataCompleteness =
  | "COMPLETE" // Has serviceability + telemetry + ISIS data
  | "MISSING_ISIS" // Has serviceability + telemetry, but NO ISIS data
  | "MISSING_TELEMETRY" // Has serviceability + ISIS, but NO telemetry
  | "MISSING_BOTH"; // Has serviceability, but missing both ISIS and telemetry

/**
 * Topology link with health metrics
 *
 * Result of three-way comparison between serviceability, telemetry, and IS-IS data.
 */
export interface TopologyLink {
  // Link identification
  link_pk: string;
  link_code: string; // NEW: "device_a:device_z" format

  // Device codes (public on-chain data - NOT PKs!)
  device_a_code: string;
  device_z_code: string;

  // Device A location information
  device_a_lat: number;
  device_a_lon: number;
  device_a_location_name: string;
  device_a_location_code: string;
  device_a_country: string;

  // Device Z location information
  device_z_lat: number;
  device_z_lon: number;
  device_z_location_name: string;
  device_z_location_code: string;
  device_z_country: string;

  // Interface names
  side_a_iface_name: string;
  side_b_iface_name: string;

  // Serviceability (expected)
  expected_delay_ns: number; // Expected delay in nanoseconds
  expected_delay_us: number; // Expected delay in microseconds

  // Bandwidth
  bandwidth_bps: number | null; // Raw bandwidth in bits per second
  bandwidth_gbps: number | null; // Bandwidth in Gbps (computed from bps)
  bandwidth_label: string; // Formatted display label (e.g., "100 Gbps")
  bandwidth_tier: number; // Tier for grouping (0, 10, 50, 100, 200)

  // Telemetry (measured)
  measured_p50_us: number | null; // p50 percentile RTT in microseconds
  measured_p90_us: number | null; // p90 percentile RTT
  measured_p95_us: number | null; // p95 percentile RTT
  measured_p99_us: number | null; // p99 percentile RTT
  telemetry_sample_count: number | null; // Number of RTT samples

  // IS-IS (configured)
  isis_metric: number | null; // IS-IS routing metric
  isis_interface_name: string | null; // IS-IS interface name

  // Health metrics
  drift_pct: number | null; // Percentage drift between expected and measured
  health_status: HealthStatus; // Overall health status

  // Data completeness
  data_status: DataCompleteness; // Data completeness status
  has_serviceability: boolean; // Always true (required for link to exist)
  has_telemetry: boolean; // Has telemetry data
  has_isis: boolean; // Has IS-IS data
}

/**
 * Topology health summary statistics
 */
export interface TopologyHealthSummary {
  total_links: number;
  healthy: number;
  drift_high: number;
  missing_telemetry: number;
  missing_isis: number;
}

/**
 * Bandwidth statistics summary
 */
export interface BandwidthStats {
  total_capacity_gbps: number; // Sum of all link bandwidths
  average_bandwidth_gbps: number; // Average link bandwidth
  distribution: Record<number, number>; // Count by tier: {10: 69, 50: 1, 100: 17, 200: 1}
  links_by_tier: Record<number, number>; // Same as distribution (for compatibility)
}

/**
 * Serviceability link data (from snapshot.json)
 * Source: fetch_data.dz_serviceability.links
 */
export interface ServiceabilityLink {
  link_pk: string;
  side_a_location_pk: string;
  side_b_location_pk: string;
  side_a_iface_name: string;
  side_b_iface_name: string;
  delay_ns: number;
  bandwidth: number; // Bandwidth in bits per second
  tunnel_net: string | null; // e.g., "172.16.0.222/31" - used for ISIS matching
  [key: string]: any; // Additional fields from JSON
}

/**
 * Telemetry data (from snapshot.json)
 * Source: fetch_data.dz_telemetry.device_latency_samples
 */
export interface TelemetryData {
  link_pk: string;
  samples: number[]; // Array of RTT samples in microseconds
  [key: string]: any; // Additional fields from JSON
}

/**
 * IS-IS adjacency data (from isis-db.json)
 * Source: vrfs.default.isisInstances.*.lsps.*.adjacencies
 */
export interface IsisAdjacency {
  adjInterfaceAddress: string; // IP address for matching with tunnel_net
  metric: number; // IS-IS routing metric
  systemId: string; // Remote system identifier (may need obfuscation)
  [key: string]: any; // Additional fields from JSON
}

/**
 * IS-IS LSP data with hostname
 */
export interface IsisLsp {
  hostname?: string; // LSP hostname (may need obfuscation)
  adjacencies: IsisAdjacency[];
  [key: string]: any; // Additional fields from JSON
}

/**
 * Geographic location data for map visualization
 * Source: fetch_data.dz_serviceability.locations
 */
export interface Location {
  location_pk: string;
  code: string; // Location code (e.g., "CORE-LA2")
  name: string; // Location name (e.g., "Los Angeles")
  lat: number; // Latitude
  lon: number; // Longitude (note: deck.gl uses [lon, lat] order)
  country?: string; // Country code
  device_count: number; // NEW: Number of devices at this location
  devices: string[]; // NEW: Array of device codes at this location
  reference_count?: number; // For backward compatibility - same as device_count
}

/**
 * Network link for Deck.gl visualization
 */
export interface NetworkLink {
  link_pk: string;
  source_location_pk: string;
  target_location_pk: string;
  source_lat: number;
  source_lon: number;
  target_lat: number;
  target_lon: number;
  health_status: HealthStatus;
  drift_pct: number | null;
  expected_delay_us: number;
  measured_p50_us: number | null;
}

/**
 * Health status color mapping for visualization
 */
export const HEALTH_STATUS_COLORS: Record<
  HealthStatus,
  { rgb: [number, number, number]; hex: string; tailwind: string }
> = {
  HEALTHY: {
    rgb: [34, 197, 94],
    hex: "#22c55e",
    tailwind: "text-dz-green",
  },
  DRIFT_HIGH: {
    rgb: [239, 68, 68],
    hex: "#ef4444",
    tailwind: "text-dz-red",
  },
  MISSING_TELEMETRY: {
    rgb: [161, 161, 170],
    hex: "#a1a1aa",
    tailwind: "text-dz-gray-300",
  },
  MISSING_ISIS: {
    rgb: [161, 161, 170],
    hex: "#a1a1aa",
    tailwind: "text-dz-gray-300",
  },
};

/**
 * Get RGB color for health status
 *
 * @param status - Health status
 * @returns RGB array [r, g, b]
 */
export function getHealthColor(status: HealthStatus): [number, number, number] {
  return HEALTH_STATUS_COLORS[status].rgb;
}

/**
 * Get hex color for health status
 *
 * @param status - Health status
 * @returns Hex color string
 */
export function getHealthHex(status: HealthStatus): string {
  return HEALTH_STATUS_COLORS[status].hex;
}

/**
 * Get Tailwind class for health status
 *
 * @param status - Health status
 * @returns Tailwind CSS class name
 */
export function getHealthTailwind(status: HealthStatus): string {
  return HEALTH_STATUS_COLORS[status].tailwind;
}

/**
 * Convert RGB array to hex color string
 *
 * @param rgb - RGB array [r, g, b]
 * @returns Hex color string (e.g., "#2ecc71")
 */
export function rgbToHex(rgb: [number, number, number]): string {
  return `#${rgb.map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Data completeness status color mapping for visualization
 */
export const DATA_STATUS_COLORS: Record<
  DataCompleteness,
  { rgb: [number, number, number]; hex: string; tailwind: string }
> = {
  COMPLETE: {
    rgb: [34, 197, 94], // Green
    hex: "#22c55e",
    tailwind: "text-green-500",
  },
  MISSING_ISIS: {
    rgb: [239, 68, 68], // Red (high alert)
    hex: "#ef4444",
    tailwind: "text-red-500",
  },
  MISSING_TELEMETRY: {
    rgb: [234, 179, 8], // Yellow
    hex: "#eab308",
    tailwind: "text-yellow-500",
  },
  MISSING_BOTH: {
    rgb: [161, 161, 170], // Gray
    hex: "#a1a1aa",
    tailwind: "text-gray-400",
  },
};

/**
 * Get RGB color for data completeness status
 *
 * @param status - Data completeness status
 * @returns RGB array [r, g, b]
 */
export function getDataStatusColor(
  status: DataCompleteness
): [number, number, number] {
  return DATA_STATUS_COLORS[status].rgb;
}

/**
 * Get hex color for data completeness status
 *
 * @param status - Data completeness status
 * @returns Hex color string
 */
export function getDataStatusHex(status: DataCompleteness): string {
  return DATA_STATUS_COLORS[status].hex;
}

/**
 * Get Tailwind class for data completeness status
 *
 * @param status - Data completeness status
 * @returns Tailwind CSS class name
 */
export function getDataStatusTailwind(status: DataCompleteness): string {
  return DATA_STATUS_COLORS[status].tailwind;
}

/**
 * Get human-readable label for data completeness status
 *
 * @param status - Data completeness status
 * @returns Human-readable label
 */
export function getDataStatusLabel(status: DataCompleteness): string {
  const labels: Record<DataCompleteness, string> = {
    COMPLETE: "Complete",
    MISSING_ISIS: "Missing IS-IS",
    MISSING_TELEMETRY: "Missing Telemetry",
    MISSING_BOTH: "Missing Both",
  };
  return labels[status];
}
