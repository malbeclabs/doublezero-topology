"use client";

import React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMapFilterStore } from "@/lib/stores/map-filter-store";

/**
 * ActiveFiltersSection Component
 *
 * Displays sticky badges for active filters at top of sidebar
 * Follows professional UX patterns:
 * - Clear visual indicator of what filters are applied
 * - Individual "x" buttons to remove specific filters
 * - "Clear All" button when multiple filters active
 */
export function ActiveFiltersSection() {
  const {
    bandwidthTiers,
    healthStatuses,
    toggleBandwidthTier,
    toggleHealthStatus,
    clearAllFilters,
  } = useMapFilterStore();

  const hasActiveFilters = bandwidthTiers.size > 0 || healthStatuses.size > 0;

  if (!hasActiveFilters) {
    return null;
  }

  // Format health status for display
  const formatHealthStatus = (status: string) => {
    return status.replace(/_/g, " ");
  };

  return (
    <div className="sticky top-0 z-10 bg-background border-b border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Active Filters
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="h-6 px-2 text-xs"
        >
          Clear All
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {/* Bandwidth filters */}
        {Array.from(bandwidthTiers).map((tier) => (
          <Badge
            key={tier}
            variant="secondary"
            className="gap-1 text-xs"
          >
            {tier} Gbps
            <X
              className="h-3 w-3 cursor-pointer hover:text-destructive"
              onClick={() => toggleBandwidthTier(tier)}
            />
          </Badge>
        ))}

        {/* Health status filters */}
        {Array.from(healthStatuses).map((status) => (
          <Badge
            key={status}
            variant="secondary"
            className="gap-1 text-xs"
          >
            {formatHealthStatus(status)}
            <X
              className="h-3 w-3 cursor-pointer hover:text-destructive"
              onClick={() => toggleHealthStatus(status)}
            />
          </Badge>
        ))}
      </div>
    </div>
  );
}
