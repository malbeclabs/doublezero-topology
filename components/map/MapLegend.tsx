"use client";

/**
 * Simple Map Legend Component (Google Maps Style)
 *
 * Displays a minimal, non-interactive legend showing link health statuses
 * and their corresponding colors on the map.
 */
export function MapLegend() {
  return (
    <div className="absolute bottom-6 left-6 z-20">
      <div className="
        bg-background/95 backdrop-blur-sm
        border border-border rounded-xl
        shadow-lg
        p-4
        w-64
      ">
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-6 h-1 bg-green-500 rounded flex-shrink-0" />
            <span className="text-xs text-muted-foreground">Healthy</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-6 h-1 bg-orange-500 rounded flex-shrink-0" />
            <span className="text-xs text-muted-foreground">Drift High</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-6 h-1 bg-yellow-500 rounded flex-shrink-0" />
            <span className="text-xs text-muted-foreground">Missing Telemetry</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-6 h-1 bg-red-500 rounded flex-shrink-0" />
            <span className="text-xs text-muted-foreground">Missing IS-IS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
