"use client";

/**
 * Map Page
 *
 * Full-screen interactive map view showing network topology.
 */

import { useTopology } from "@/contexts/TopologyContext";
import { MapboxMap } from "@/components/map/MapboxMap";
import { MapLegend } from "@/components/map/MapLegend";
import { DataStatusLegend } from "@/components/map/DataStatusLegend";
import { MapSearch } from "@/components/map/MapSearch";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";
import type { HealthStatus, DataCompleteness } from "@/types/topology";
import { useTableStore } from "@/lib/stores/table-store";

function MapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { topologyData, isLoading, error } = useTopology();
  const { setSelectedLink } = useTableStore();
  const [mounted, setMounted] = useState(false);

  // State for filtering links by health status
  const [visibleStatuses, setVisibleStatuses] = useState<Set<HealthStatus>>(
    new Set(["HEALTHY", "DRIFT_HIGH", "MISSING_TELEMETRY", "MISSING_ISIS"])
  );

  // State for filtering links by data completeness status
  const [visibleDataStatuses, setVisibleDataStatuses] = useState<Set<DataCompleteness>>(
    new Set(["COMPLETE", "MISSING_ISIS", "MISSING_TELEMETRY", "MISSING_BOTH"])
  );

  // Toggle visibility of a health status
  const handleToggleStatus = (status: HealthStatus) => {
    setVisibleStatuses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  // Toggle visibility of a data status
  const handleToggleDataStatus = (status: DataCompleteness) => {
    setVisibleDataStatuses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  // Calculate data status counts
  const dataStatusCounts = useMemo(() => {
    if (!topologyData) return { complete: 0, missing_isis: 0, missing_telemetry: 0, missing_both: 0 };

    return topologyData.topology.reduce((acc, link) => {
      if (link.data_status === "COMPLETE") acc.complete++;
      else if (link.data_status === "MISSING_ISIS") acc.missing_isis++;
      else if (link.data_status === "MISSING_TELEMETRY") acc.missing_telemetry++;
      else if (link.data_status === "MISSING_BOTH") acc.missing_both++;
      return acc;
    }, { complete: 0, missing_isis: 0, missing_telemetry: 0, missing_both: 0 });
  }, [topologyData]);

  // Prevent hydration mismatch by only rendering on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Read link_pk from URL params and set selected link in store
  useEffect(() => {
    const linkPk = searchParams.get('link_pk');
    if (linkPk) {
      setSelectedLink(linkPk);
    }
  }, [searchParams, setSelectedLink]);

  // Show loading state during SSR and initial client mount
  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
              <p className="text-muted-foreground">Loading map data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-destructive">Error Loading Map</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => router.push("/upload")}>Back to Upload</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!topologyData) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">No Data Available</h3>
              <p className="text-sm text-muted-foreground">
                Please upload topology data files to view the map.
              </p>
              <Button onClick={() => router.push("/upload")}>Go to Upload</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full relative">
      <MapboxMap
        links={topologyData.topology.filter(link => visibleDataStatuses.has(link.data_status))}
        locations={topologyData.locations}
        visibleStatuses={visibleStatuses}
        key={`map-${visibleDataStatuses.size}-${Array.from(visibleDataStatuses).join(',')}`}
      />

      {/* Search bar - Top Left */}
      <div className="absolute top-4 left-4 w-96 z-10">
        <div className="bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-3">
          <MapSearch
            links={topologyData.topology}
            locations={topologyData.locations}
          />
        </div>
      </div>

      {/* Data Status Legend - Bottom Left */}
      <div className="absolute bottom-4 left-4">
        <DataStatusLegend
          dataStatusCounts={dataStatusCounts}
          totalLinks={topologyData.summary.total_links}
          visibleStatuses={visibleDataStatuses}
          onToggleStatus={handleToggleDataStatus}
        />
      </div>

      {/* Navigation buttons - Top Right */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          variant="outline"
          onClick={() => router.push("/")}
          className="bg-background/95 backdrop-blur-sm shadow-lg"
        >
          Dashboard
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/links")}
          className="bg-background/95 backdrop-blur-sm shadow-lg"
        >
          Data Table
        </Button>
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <MapPageContent />
    </Suspense>
  );
}
