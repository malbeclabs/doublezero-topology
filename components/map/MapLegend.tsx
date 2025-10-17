"use client";

/**
 * Interactive Map Legend Component
 *
 * Displays health status distribution with filtering capabilities.
 * Allows users to toggle visibility of different health statuses on the map.
 */

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { HealthStatus } from "@/types/topology";
import { getHealthHex } from "@/types/topology";

interface HealthStatusInfo {
  status: HealthStatus;
  label: string;
  color: string;
  count: number;
}

interface MapLegendProps {
  healthStatusCounts: {
    healthy: number;
    drift_high: number;
    missing_telemetry: number;
    missing_isis: number;
  };
  totalLinks: number;
  visibleStatuses: Set<HealthStatus>;
  onToggleStatus: (status: HealthStatus) => void;
}

export function MapLegend({
  healthStatusCounts,
  totalLinks,
  visibleStatuses,
  onToggleStatus,
}: MapLegendProps) {
  const statusInfo: HealthStatusInfo[] = [
    {
      status: "HEALTHY",
      label: "Healthy",
      color: getHealthHex("HEALTHY"),
      count: healthStatusCounts.healthy,
    },
    {
      status: "DRIFT_HIGH",
      label: "Drift High",
      color: getHealthHex("DRIFT_HIGH"),
      count: healthStatusCounts.drift_high,
    },
    {
      status: "MISSING_TELEMETRY",
      label: "Missing Telemetry",
      color: getHealthHex("MISSING_TELEMETRY"),
      count: healthStatusCounts.missing_telemetry,
    },
    {
      status: "MISSING_ISIS",
      label: "Missing IS-IS",
      color: getHealthHex("MISSING_ISIS"),
      count: healthStatusCounts.missing_isis,
    },
  ];

  const getPercentage = (count: number): string => {
    if (totalLinks === 0) return "0.0";
    return ((count / totalLinks) * 100).toFixed(1);
  };

  return (
    <Card
      className="bg-background/95 backdrop-blur-sm border-border"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-sm font-semibold text-foreground">
          Link Health Status
        </CardTitle>
        <p className="font-body text-xs text-muted-foreground mt-1">
          Click to show/hide on map
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {statusInfo.map((info) => {
          const isVisible = visibleStatuses.has(info.status);
          const percentage = getPercentage(info.count);

          return (
            <div
              key={info.status}
              className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-all hover:bg-accent/50 ${
                !isVisible ? "opacity-50" : ""
              }`}
              onClick={() => onToggleStatus(info.status)}
            >
              {/* Checkbox */}
              <Checkbox
                checked={isVisible}
                onCheckedChange={() => onToggleStatus(info.status)}
                className="shrink-0"
              />

              {/* Color indicator */}
              <div
                className="w-8 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: info.color }}
              />

              {/* Status label and count */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">
                  {info.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {info.count} ({percentage}%)
                </div>
              </div>
            </div>
          );
        })}

        {/* Total */}
        <div className="pt-2 mt-2 border-t border-border">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-muted-foreground">
              Total Links
            </span>
            <span className="font-semibold text-foreground">{totalLinks}</span>
          </div>
          <div className="flex justify-between items-center text-xs mt-1">
            <span className="font-medium text-muted-foreground">Visible</span>
            <span className="font-semibold text-foreground">
              {statusInfo
                .filter((info) => visibleStatuses.has(info.status))
                .reduce((sum, info) => sum + info.count, 0)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
