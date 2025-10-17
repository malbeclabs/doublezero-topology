"use client";

/**
 * Map Page
 *
 * Full-screen interactive map view showing network topology.
 */

import { useTopology } from "@/contexts/TopologyContext";
import { MapboxMap } from "@/components/map/MapboxMap";
import { MapLegend } from "@/components/map/MapLegend";
import { MapSearch } from "@/components/map/MapSearch";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { HealthStatus } from "@/types/topology";

export default function MapPage() {
  const router = useRouter();
  const { topologyData, isLoading, error } = useTopology();
  const [mounted, setMounted] = useState(false);

  // State for filtering links by health status
  const [visibleStatuses, setVisibleStatuses] = useState<Set<HealthStatus>>(
    new Set(["HEALTHY", "DRIFT_HIGH", "MISSING_TELEMETRY", "MISSING_ISIS"])
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

  // Prevent hydration mismatch by only rendering on client
  useEffect(() => {
    setMounted(true);
  }, []);

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
        links={topologyData.topology}
        locations={topologyData.locations}
        visibleStatuses={visibleStatuses}
      />

      {/* Search bar */}
      <div className="absolute top-4 left-4 w-96">
        <div className="bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-3">
          <MapSearch
            links={topologyData.topology}
            locations={topologyData.locations}
          />
        </div>
      </div>

      {/* Interactive map legend */}
      <div className="absolute bottom-4 left-4">
        <MapLegend
          healthStatusCounts={{
            healthy: topologyData.summary.healthy,
            drift_high: topologyData.summary.drift_high,
            missing_telemetry: topologyData.summary.missing_telemetry,
            missing_isis: topologyData.summary.missing_isis,
          }}
          totalLinks={topologyData.summary.total_links}
          visibleStatuses={visibleStatuses}
          onToggleStatus={handleToggleStatus}
        />
      </div>

      {/* Navigation buttons */}
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
