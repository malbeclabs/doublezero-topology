"use client";

/**
 * Data Status Legend Component
 *
 * Displays data completeness distribution with filtering capabilities.
 * Allows users to toggle visibility of different data statuses on the map.
 */

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { DataCompleteness } from "@/types/topology";
import { getDataStatusHex } from "@/types/topology";

interface DataStatusInfo {
  status: DataCompleteness;
  label: string;
  color: string;
  count: number;
}

interface DataStatusLegendProps {
  dataStatusCounts: {
    complete: number;
    missing_isis: number;
    missing_telemetry: number;
    missing_both: number;
  };
  totalLinks: number;
  visibleStatuses: Set<DataCompleteness>;
  onToggleStatus: (status: DataCompleteness) => void;
}

export function DataStatusLegend({
  dataStatusCounts,
  totalLinks,
  visibleStatuses,
  onToggleStatus,
}: DataStatusLegendProps) {
  const statusInfo: DataStatusInfo[] = [
    {
      status: "COMPLETE",
      label: "Complete",
      color: getDataStatusHex("COMPLETE"),
      count: dataStatusCounts.complete,
    },
    {
      status: "MISSING_ISIS",
      label: "Missing IS-IS",
      color: getDataStatusHex("MISSING_ISIS"),
      count: dataStatusCounts.missing_isis,
    },
    {
      status: "MISSING_TELEMETRY",
      label: "Missing Telemetry",
      color: getDataStatusHex("MISSING_TELEMETRY"),
      count: dataStatusCounts.missing_telemetry,
    },
    {
      status: "MISSING_BOTH",
      label: "Missing Both",
      color: getDataStatusHex("MISSING_BOTH"),
      count: dataStatusCounts.missing_both,
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
        <CardTitle className="text-sm font-bold text-foreground">
          Data Completeness
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1 font-light">
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
