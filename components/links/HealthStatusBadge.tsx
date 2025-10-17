/**
 * Health Status Badge Component
 *
 * Displays a colored badge representing the health status of a network link.
 */

import { Badge } from "@/components/ui/badge";
import { HealthStatus, getHealthHex } from "@/types/topology";

interface HealthStatusBadgeProps {
  status: HealthStatus;
  className?: string;
}

/**
 * Get human-readable label for health status
 */
function getStatusLabel(status: HealthStatus): string {
  switch (status) {
    case "HEALTHY":
      return "Healthy";
    case "DRIFT_HIGH":
      return "Drift High";
    case "MISSING_TELEMETRY":
      return "Missing Telemetry";
    case "MISSING_ISIS":
      return "Missing IS-IS";
  }
}

export function HealthStatusBadge({ status, className }: HealthStatusBadgeProps) {
  const color = getHealthHex(status);
  const label = getStatusLabel(status);

  return (
    <Badge
      className={className}
      style={{
        backgroundColor: color,
        color: "#ffffff",
        border: "none",
      }}
    >
      {label}
    </Badge>
  );
}
