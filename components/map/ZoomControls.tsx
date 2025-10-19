"use client";

import { Plus, Minus } from "lucide-react";
import type { MapRef } from "react-map-gl/maplibre";

interface ZoomControlsProps {
  mapRef: React.RefObject<MapRef | null>;
}

/**
 * Map Zoom Controls Component (Google Maps Style)
 *
 * Provides zoom in/out buttons positioned in the bottom-right corner.
 * Follows Google Maps/MapBox GL design patterns.
 */
export function ZoomControls({ mapRef }: ZoomControlsProps) {
  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  return (
    <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
      <button
        onClick={handleZoomIn}
        className="
          w-10 h-10
          bg-background/95 backdrop-blur-sm
          border border-border rounded-lg
          shadow-md hover:shadow-lg
          transition-all
          flex items-center justify-center
          hover:bg-accent
          focus:outline-none focus:ring-2 focus:ring-primary/20
        "
        title="Zoom in"
        aria-label="Zoom in"
      >
        <Plus className="h-5 w-5" />
      </button>

      <button
        onClick={handleZoomOut}
        className="
          w-10 h-10
          bg-background/95 backdrop-blur-sm
          border border-border rounded-lg
          shadow-md hover:shadow-lg
          transition-all
          flex items-center justify-center
          hover:bg-accent
          focus:outline-none focus:ring-2 focus:ring-primary/20
        "
        title="Zoom out"
        aria-label="Zoom out"
      >
        <Minus className="h-5 w-5" />
      </button>
    </div>
  );
}
