"use client";

import React from "react";
import { Filter } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TopologyLink } from "@/types/topology";
import { BandwidthFilter } from "./filters/BandwidthFilter";
import { HealthStatusFilter } from "./filters/HealthStatusFilter";
import { ActiveFiltersSection } from "./filters/ActiveFiltersSection";

interface MapSidebarProps {
  links: TopologyLink[];
  visibleCount: number;
}

export function MapSidebar({ links, visibleCount }: MapSidebarProps) {
  const totalCount = links.length;

  return (
    <div className="w-80 bg-background border-r border-border flex flex-col h-full">
      {/* Header with Stats */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Showing:</span>
          <span className="font-semibold">
            {visibleCount} of {totalCount} links
          </span>
        </div>
      </div>

      {/* Active Filters Section - Fixed height to prevent layout shift */}
      <div className="min-h-[60px] border-b border-border">
        <ActiveFiltersSection />
      </div>

      {/* Scrollable Filter Sections */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Bandwidth Filter */}
          <BandwidthFilter links={links} />

          {/* Health Status Filter */}
          <HealthStatusFilter links={links} />
        </div>
      </ScrollArea>
    </div>
  );
}
