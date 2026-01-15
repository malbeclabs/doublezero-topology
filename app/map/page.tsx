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
import { RouteModal } from "@/components/map/RouteModal";
import { PathComputedPanel } from "@/components/map/PathComputedPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useTableStore } from "@/lib/stores/table-store";
import { useMapFilterStore } from "@/lib/stores/map-filter-store";
import { usePathStore } from "@/lib/stores/path-store";
import { useMapModeStore } from "@/lib/stores/map-mode-store";
import { computePathSync } from "@/lib/graph/compute-path";
import { filterLinks } from "@/lib/map/filter-links";
import { Route, X } from "lucide-react";
import type { WeightingStrategy } from "@/lib/graph/types";

function MapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { processedTopology, isLoading, error } = useTopology();
  const { setSelectedLink } = useTableStore();
  const {
    weightingStrategy,
    computedPath,
    isComputing: isComputingPath,
    error: pathError,
    setWeightingStrategy,
    setComputedPath,
    setError: setPathError,
    setIsComputing,
  } = usePathStore();
  const [mounted, setMounted] = useState(false);

  // Get filter state from Zustand store using granular selectors
  const bandwidthTiers = useMapFilterStore((s) => s.bandwidthTiers);
  const healthStatuses = useMapFilterStore((s) => s.healthStatuses);
  const driftRange = useMapFilterStore((s) => s.driftRange);
  const dataStatuses = useMapFilterStore((s) => s.dataStatuses);
  const searchQuery = useMapFilterStore((s) => s.searchQuery);

  // Get map mode state
  const {
    isExplorationMode,
    isPathActiveMode,
    enterPathActiveMode,
    exitToExplorationMode,
  } = useMapModeStore();

  // Handler to exit path mode and clear path
  const handleExitPathMode = () => {
    exitToExplorationMode();
    setComputedPath(null);
    setPathError(null);
  };

  // Handler to open route modal and clear link details
  const handleOpenRouteModal = () => {
    setSelectedLink(null); // Clear any selected link
    setIsRouteModalOpen(true);
  };

  // Modal state
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);

  // Highlighted hop state (clicked)
  const [highlightedHopIndex, setHighlightedHopIndex] = useState<number | null>(null);

  // Current hop state (packet traversing)
  const [currentHopIndex, setCurrentHopIndex] = useState<number | null>(null);

  // Apply filters to links (must be called before conditional returns - Rules of Hooks)
  const filteredLinks = useMemo(() => {
    if (!processedTopology?.topology) return [];
    return filterLinks(processedTopology.topology, {
      bandwidthTiers,
      healthStatuses,
      driftRange,
      dataStatuses,
      searchQuery,
    });
  }, [processedTopology?.topology, bandwidthTiers, healthStatuses, driftRange, dataStatuses, searchQuery]);

  // Handler for computing path from modal
  const handleComputePath = (
    sourceId: string,
    destinationId: string,
    strategy: WeightingStrategy,
  ) => {
    if (!processedTopology?.topology) return;

    setWeightingStrategy(strategy);
    setIsComputing(true);

    try {
      const result = computePathSync({
        links: processedTopology.topology,
        sourceId,
        destinationId,
        weightingStrategy: strategy,
      });

      if (result.error) {
        setPathError(result.error);
        setComputedPath(null);
      } else if (result.path) {
        setComputedPath(result.path);
        setPathError(null);
        // Close modal and transition to path-active mode
        setIsRouteModalOpen(false);
        enterPathActiveMode();
      }
    } catch (err) {
      setPathError(err instanceof Error ? err.message : "Failed to compute path");
      setComputedPath(null);
    } finally {
      setIsComputing(false);
    }
  };

  // Handler for strategy change - recompute path with new strategy
  const handleStrategyChange = (newStrategy: typeof weightingStrategy) => {
    if (!isPathActiveMode() || !computedPath || !processedTopology?.topology) {
      return;
    }

    setWeightingStrategy(newStrategy);
    setIsComputing(true);

    try {
      const result = computePathSync({
        links: processedTopology.topology,
        sourceId: computedPath.source.name,
        destinationId: computedPath.destination.name,
        weightingStrategy: newStrategy,
      });

      if (result.error) {
        setPathError(result.error);
      } else if (result.path) {
        setComputedPath(result.path);
        setPathError(null);
      }
    } catch (err) {
      setPathError(err instanceof Error ? err.message : "Failed to recompute path");
    } finally {
      setIsComputing(false);
    }
  };

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
              <Button onClick={() => router.push("/")}>Load Data</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!processedTopology) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">No Data Available</h3>
              <p className="text-sm text-muted-foreground">
                Please load topology data files to view the map.
              </p>
              <Button onClick={() => router.push("/")}>Load Data</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex overflow-hidden relative">
      {/* Sidebar */}
      <MapSidebar
        links={processedTopology.topology}
        visibleCount={filteredLinks.length}
      />

      {/* Map Container with Floating Search */}
      <div className="flex-1 relative">
        {/* Floating Search Overlay */}
        <MapSearch
          links={processedTopology.topology}
          locations={processedTopology.locations}
        />

        {/* Plan Route / Exit Path Mode Button */}
        <div className="absolute top-4 right-4 z-[1000]">
          {isExplorationMode() ? (
            <Button
              onClick={handleOpenRouteModal}
              size="lg"
              className="shadow-lg"
            >
              <Route className="h-5 w-5 mr-2" />
              Plan Route
            </Button>
          ) : (
            <Button
              onClick={handleExitPathMode}
              size="lg"
              variant="secondary"
              className="shadow-lg"
            >
              <X className="h-5 w-5 mr-2" />
              Exit Path Mode
            </Button>
          )}
        </div>

        {/* Route Planning Modal */}
        <RouteModal
          open={isRouteModalOpen}
          onOpenChange={setIsRouteModalOpen}
          locations={processedTopology.locations}
          onComputePath={handleComputePath}
          isComputing={isComputingPath}
        />

        {/* Error Alert - Shows when path computation fails */}
        {pathError && (
          <div className="absolute top-32 left-1/2 -translate-x-1/2 z-[1000]">
            <Card className="w-96 border-destructive">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 text-destructive">⚠</div>
                  <div>
                    <h4 className="font-semibold text-destructive mb-1">Path Computation Error</h4>
                    <p className="text-sm text-muted-foreground">{pathError}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Path Computed Panel - Show in path-active mode */}
        {isPathActiveMode() && computedPath && (
          <PathComputedPanel
            path={computedPath}
            strategy={weightingStrategy}
            onClose={handleExitPathMode}
            onStrategyChange={handleStrategyChange}
            isRecomputing={isComputingPath}
            onHopClick={setHighlightedHopIndex}
            highlightedHopIndex={highlightedHopIndex}
            currentHopIndex={currentHopIndex}
          />
        )}

        {/* Map */}
        <MapboxMap
          links={filteredLinks}
          locations={processedTopology.locations}
          onCurrentHopChange={setCurrentHopIndex}
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
