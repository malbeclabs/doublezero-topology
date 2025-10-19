"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { TopologyLink, DataCompleteness } from "@/types/topology";
import { useMapFilterStore } from "@/lib/stores/map-filter-store";

interface DataCompletenessFilterProps {
  links: TopologyLink[];
}

const DATA_STATUSES: Array<{
  value: DataCompleteness;
  label: string;
  color: string;
}> = [
  { value: "COMPLETE", label: "Complete Data", color: "bg-green-500" },
  { value: "MISSING_ISIS", label: "Missing IS-IS", color: "bg-red-500" },
  { value: "MISSING_TELEMETRY", label: "Missing Telemetry", color: "bg-orange-500" },
  { value: "MISSING_BOTH", label: "Missing Both", color: "bg-gray-500" },
];

export function DataCompletenessFilter({ links }: DataCompletenessFilterProps) {
  const { dataStatuses, toggleDataStatus } = useMapFilterStore();

  // Calculate link counts per data status
  const statusCounts = React.useMemo(() => {
    const counts: Record<DataCompleteness, number> = {
      COMPLETE: 0,
      MISSING_ISIS: 0,
      MISSING_TELEMETRY: 0,
      MISSING_BOTH: 0,
    };

    links.forEach(link => {
      if (link.data_status in counts) {
        counts[link.data_status]++;
      }
    });

    return counts;
  }, [links]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Data Completeness</h3>
      <p className="text-xs text-muted-foreground">
        {dataStatuses.size === 0 ? "Showing all" : `Filtering ${dataStatuses.size} selected`}
      </p>

      <div className="space-y-2">
        {DATA_STATUSES.map(status => (
          <label
            key={status.value}
            className="flex items-center justify-between cursor-pointer group hover:bg-accent/50 p-2 rounded-md transition-colors"
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={dataStatuses.has(status.value)}
                onCheckedChange={() => toggleDataStatus(status.value)}
              />
              <div className={`h-3 w-3 rounded flex-shrink-0 ${status.color}`} />
              <span className="text-sm">{status.label}</span>
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
