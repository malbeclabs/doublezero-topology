"use client";

/**
 * Map Page
 *
 * Full-screen interactive map view showing network topology with comprehensive filtering sidebar.
 */

import { useTopology } from "@/contexts/TopologyContext";
import { MapboxMap } from "@/components/map/MapboxMap";
import { MapSidebar } from "@/components/map/MapSidebar";
import { MapSearch } from "@/components/map/MapSearch";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useTableStore } from "@/lib/stores/table-store";
import { useMapFilterStore } from "@/lib/stores/map-filter-store";
import { filterLinks } from "@/lib/map/filter-links";

function MapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { topologyData, isLoading, error } = useTopology();
  const { setSelectedLink } = useTableStore();
  const [mounted, setMounted] = useState(false);

  // Get filter state from Zustand store
  const filters = useMapFilterStore();

  // Apply filters to links (must be called before conditional returns - Rules of Hooks)
  const filteredLinks = useMemo(() => {
    if (!topologyData?.topology) return [];
    return filterLinks(topologyData.topology, {
      bandwidthTiers: filters.bandwidthTiers,
      healthStatuses: filters.healthStatuses,
      driftRange: filters.driftRange,
      dataStatuses: filters.dataStatuses,
      searchQuery: filters.searchQuery,
    });
  }, [topologyData?.topology, filters.bandwidthTiers, filters.healthStatuses, filters.driftRange, filters.dataStatuses, filters.searchQuery]);

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
    <div className="h-[calc(100vh-4rem)] w-full flex overflow-hidden">
      {/* Sidebar */}
      <MapSidebar
        links={topologyData.topology}
        visibleCount={filteredLinks.length}
      />

      {/* Map Container with Floating Search */}
      <div className="flex-1 relative">
        {/* Floating Search Overlay */}
        <MapSearch
          links={topologyData.topology}
          locations={topologyData.locations}
        />

        {/* Map */}
        <MapboxMap
          links={filteredLinks}
          locations={topologyData.locations}
        />
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
