"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { TopologyLink, HealthStatus } from "@/types/topology";
import { useMapFilterStore } from "@/lib/stores/map-filter-store";

interface HealthStatusFilterProps {
  links: TopologyLink[];
}

const HEALTH_STATUSES: Array<{
  value: HealthStatus;
  label: string;
  emoji: string;
  color: string;
}> = [
  { value: "HEALTHY", label: "Healthy", emoji: "🟢", color: "text-green-600 dark:text-green-400" },
  { value: "DRIFT_HIGH", label: "Drift High", emoji: "🟠", color: "text-orange-600 dark:text-orange-400" },
  { value: "MISSING_TELEMETRY", label: "Missing Telemetry", emoji: "🟡", color: "text-yellow-600 dark:text-yellow-400" },
  { value: "MISSING_ISIS", label: "Missing IS-IS", emoji: "🔴", color: "text-red-600 dark:text-red-400" },
];

export function HealthStatusFilter({ links }: HealthStatusFilterProps) {
  const { healthStatuses, toggleHealthStatus } = useMapFilterStore();

  // Calculate link counts per health status
  const statusCounts = React.useMemo(() => {
    const counts: Record<HealthStatus, number> = {
      HEALTHY: 0,
      DRIFT_HIGH: 0,
      MISSING_TELEMETRY: 0,
      MISSING_ISIS: 0,
    };

    links.forEach(link => {
      if (link.health_status in counts) {
        counts[link.health_status]++;
      }
    });

    return counts;
  }, [links]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Health Status</h3>
      <p className="text-xs text-muted-foreground">
        {healthStatuses.size === 0 ? "Showing all" : `Filtering ${healthStatuses.size} selected`}
      </p>

      <div className="space-y-2">
        {HEALTH_STATUSES.map(status => (
          <label
            key={status.value}
            className="flex items-center justify-between cursor-pointer group hover:bg-accent/50 p-2 rounded-md transition-colors"
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={healthStatuses.has(status.value)}
                onCheckedChange={() => toggleHealthStatus(status.value)}
              />
              <span className="text-base">{status.emoji}</span>
              <span className={`text-sm font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {statusCounts[status.value] || 0}
            </Badge>
          </label>
        ))}
      </div>
    </div>
  );
}
