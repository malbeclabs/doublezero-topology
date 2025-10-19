"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { TopologyLink } from "@/types/topology";
import { getBandwidthTier } from "@/lib/parsers/bandwidth";
import { useMapFilterStore } from "@/lib/stores/map-filter-store";

interface BandwidthFilterProps {
  links: TopologyLink[];
}

// Bandwidth color mapping
const BANDWIDTH_COLORS: Record<number, string> = {
  10: "#22c55e",  // green-500
  50: "#14b8a6",  // teal-500
  100: "#0d9488", // teal-600
  200: "#0284c7", // sky-600
};

export function BandwidthFilter({ links }: BandwidthFilterProps) {
  const { bandwidthTiers, toggleBandwidthTier } = useMapFilterStore();

  // Auto-detect unique bandwidth values and calculate counts
  const bandwidthData = React.useMemo(() => {
    const countsMap = new Map<number, number>();

    links.forEach(link => {
      const tier = getBandwidthTier(link.bandwidth_gbps);
      countsMap.set(tier, (countsMap.get(tier) || 0) + 1);
    });

    // Sort by bandwidth value (ascending)
    const sorted = Array.from(countsMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([value, count]) => ({
        value,
        count,
        label: `${value} Gbps`,
        color: BANDWIDTH_COLORS[value] || "#94a3b8", // fallback to gray
      }));

    return sorted;
  }, [links]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Bandwidth</h3>
      <p className="text-xs text-muted-foreground">
        {bandwidthTiers.size === 0 ? "Showing all" : `Filtering ${bandwidthTiers.size} selected`}
      </p>

      <div className="space-y-2">
        {bandwidthData.map(bw => (
          <label
            key={bw.value}
            className="flex items-center justify-between cursor-pointer group hover:bg-accent/50 p-2 rounded-md transition-colors"
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={bandwidthTiers.has(bw.value)}
                onCheckedChange={() => toggleBandwidthTier(bw.value)}
              />
              <div
                className="h-3 w-3 rounded flex-shrink-0"
                style={{ backgroundColor: bw.color }}
              />
              <span className="text-sm">{bw.label}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {bw.count}
            </Badge>
          </label>
        ))}
      </div>
    </div>
  );
}
