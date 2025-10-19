"use client";

import React from "react";
import { Slider } from "@/components/ui/slider";
import type { TopologyLink } from "@/types/topology";
import { useMapFilterStore } from "@/lib/stores/map-filter-store";

interface DriftRangeFilterProps {
  links: TopologyLink[];
}

export function DriftRangeFilter({ links }: DriftRangeFilterProps) {
  const { driftRange, setDriftRange } = useMapFilterStore();

  // Local state for slider to avoid too many store updates
  const [localRange, setLocalRange] = React.useState([driftRange.min, driftRange.max]);

  // Update local state when store changes
  React.useEffect(() => {
    setLocalRange([driftRange.min, driftRange.max]);
  }, [driftRange.min, driftRange.max]);

  // Commit changes to store on slider change complete
  const handleValueCommit = (value: number[]) => {
    setDriftRange(value[0], value[1]);
  };

  // Update local state while sliding
  const handleValueChange = (value: number[]) => {
    setLocalRange(value);
  };

  // Calculate links with drift in current range
  const linksInRange = React.useMemo(() => {
    return links.filter(link =>
      link.drift_pct !== null &&
      link.drift_pct >= localRange[0] &&
      link.drift_pct <= localRange[1]
    ).length;
  }, [links, localRange]);

  const isModified = driftRange.min !== 0 || driftRange.max !== 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Drift Percentage</h3>
        {isModified && (
          <button
            onClick={() => setDriftRange(0, 100)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Range Display */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Range:</span>
          <span className="font-medium">
            {localRange[0].toFixed(0)}% - {localRange[1].toFixed(0)}%
          </span>
        </div>

        {/* Slider */}
        <div className="px-1">
          <Slider
            min={0}
            max={100}
            step={1}
            value={localRange}
            onValueChange={handleValueChange}
            onValueCommit={handleValueCommit}
            className="w-full"
          />
        </div>

        {/* Links in Range */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Links in range:</span>
          <span>{linksInRange}</span>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "< 5%", min: 0, max: 5 },
            { label: "5-10%", min: 5, max: 10 },
            { label: "10-20%", min: 10, max: 20 },
            { label: "> 20%", min: 20, max: 100 },
          ].map(preset => (
            <button
              key={preset.label}
              onClick={() => setDriftRange(preset.min, preset.max)}
              className="px-2 py-1 text-xs rounded-md border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
