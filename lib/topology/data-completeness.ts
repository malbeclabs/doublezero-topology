/**
 * Data completeness classification utility
 *
 * Determines which data sources are available for each network link.
 */

import type { DataCompleteness } from "@/types/topology";

/**
 * Classify data completeness based on available data sources
 *
 * @param hasTelemetry - Whether telemetry data is available
 * @param hasIsis - Whether IS-IS data is available
 * @returns Data completeness status
 */
export function classifyDataCompleteness(
  hasTelemetry: boolean,
  hasIsis: boolean
): DataCompleteness {
  // Serviceability is always present (required for link to exist)
  const hasServiceability = true;

  if (hasServiceability && hasTelemetry && hasIsis) {
    return "COMPLETE";
  } else if (hasServiceability && hasTelemetry && !hasIsis) {
    return "MISSING_ISIS";
  } else if (hasServiceability && !hasTelemetry && hasIsis) {
    return "MISSING_TELEMETRY";
  } else {
    return "MISSING_BOTH";
  }
}
