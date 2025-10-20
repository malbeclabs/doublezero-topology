/**
 * Path Computed Panel Component
 *
 * Merged panel that displays both path summary and detailed hop breakdown.
 * Replaces the previous PathSummaryPanel + PathHopsPanel combination.
 *
 * Features:
 * - Source and destination device names
 * - Total hops count and total latency/delay
 * - Routing strategy selector with recomputation
 * - Collapsible hop details section (collapsed by default)
 * - Hop-by-hop breakdown with delay and bandwidth metrics
 * - Close button to exit path view
 */

"use client";

import { X, Navigation, Timer, Network, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { NetworkPath, WeightingStrategy } from "@/lib/graph/types";
import { useState } from "react";

export interface PathComputedPanelProps {
  /** Computed path data */
  path: NetworkPath;

  /** Weighting strategy used */
  strategy: WeightingStrategy;

  /** Callback to close/exit path view */
  onClose: () => void;

  /** Callback when strategy changes */
  onStrategyChange?: (strategy: WeightingStrategy) => void;

  /** Whether path is recomputing */
  isRecomputing?: boolean;

  /** Callback when a hop is clicked (for highlighting) */
  onHopClick?: (hopIndex: number) => void;

  /** Currently highlighted hop index (clicked) */
  highlightedHopIndex?: number | null;

  /** Currently active hop index (packet traversing) */
  currentHopIndex?: number | null;

  /** Optional CSS class name */
  className?: string;
}

/**
 * Get strategy display name
 */
function getStrategyName(strategy: WeightingStrategy): string {
  switch (strategy) {
    case "latency":
      return "Latency (P95 RTT)";
    case "hops":
      return "Hop Count";
    case "bandwidth":
      return "Bandwidth";
    case "isis-metric":
      return "IS-IS Metric";
    case "combined":
      return "Combined";
  }
}

/**
 * Format delay in milliseconds
 */
function formatDelay(delayMs: number): string {
  if (delayMs < 1) {
    return `${(delayMs * 1000).toFixed(2)} μs`;
  } else if (delayMs < 1000) {
    return `${delayMs.toFixed(2)} ms`;
  } else {
    return `${(delayMs / 1000).toFixed(2)} s`;
  }
}

/**
 * Format bandwidth in Gbps
 */
function formatBandwidth(bandwidthGbps: number | null): string {
  if (bandwidthGbps === null) return "N/A";
  if (bandwidthGbps < 1) {
    return `${(bandwidthGbps * 1000).toFixed(0)} Mbps`;
  }
  return `${bandwidthGbps.toFixed(0)} Gbps`;
}

/**
 * Path Computed Panel
 *
 * Shows computed path summary and expandable hop-by-hop details.
 * Appears in bottom-right corner when path is computed.
 */
export function PathComputedPanel({
  path,
  strategy,
  onClose,
  onStrategyChange,
  isRecomputing = false,
  onHopClick,
  highlightedHopIndex,
  currentHopIndex,
  className,
}: PathComputedPanelProps) {
  const [isHopDetailsExpanded, setIsHopDetailsExpanded] = useState(true); // Expanded by default

  return (
    <div
      className={cn(
        // Positioning
        "absolute bottom-4 right-4 z-[1000]",

        // Layout
        "w-80",

        // Styling
        "bg-background/95 backdrop-blur-sm",
        "border rounded-lg shadow-lg",

        // Animation
        "animate-in fade-in slide-in-from-bottom-4 duration-300",

        // Custom classes
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Navigation className="h-5 w-5 text-emerald-500" />
          Path Computed
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Section */}
      <div className="p-4 space-y-3">
        {/* Route - Compact inline format */}
        <div className="flex items-center gap-2 text-sm">
          <div className="font-mono font-medium truncate">
            {path.source.name}
          </div>
          <div className="text-muted-foreground shrink-0">→</div>
          <div className="font-mono font-medium truncate">
            {path.destination.name}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
          {/* Hops */}
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Hops</div>
              <div className="font-semibold">{path.totalHops}</div>
            </div>
          </div>

          {/* Total Delay */}
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Delay</div>
              <div className="font-semibold">
                {formatDelay(path.totalLatencyUs / 1000)}
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Selector */}
        <div className="pt-3 border-t">
          <div className="text-xs text-muted-foreground mb-2">Routing Strategy</div>
          {onStrategyChange ? (
            <Select
              value={strategy}
              onValueChange={(value) => onStrategyChange(value as WeightingStrategy)}
              disabled={isRecomputing}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {isRecomputing && (
                    <RefreshCw className="h-3 w-3 mr-2 inline animate-spin" />
                  )}
                  {getStrategyName(strategy)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latency">
                  <div>
                    <div className="font-medium">Latency (P95 RTT)</div>
                    <div className="text-xs text-muted-foreground">
                      Minimize measured latency
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="hops">
                  <div>
                    <div className="font-medium">Hop Count</div>
                    <div className="text-xs text-muted-foreground">
                      Minimize number of hops
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="bandwidth">
                  <div>
                    <div className="font-medium">Bandwidth</div>
                    <div className="text-xs text-muted-foreground">
                      Maximize available bandwidth
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm font-medium">{getStrategyName(strategy)}</div>
          )}
        </div>
      </div>

      {/* Hop Details - Collapsible Section */}
      <div className="border-t">
        {/* Collapsible Header */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setIsHopDetailsExpanded(!isHopDetailsExpanded)}
        >
          <h4 className="font-semibold text-sm flex items-center gap-2">
            Hop Details
            <span className="text-xs text-muted-foreground font-normal">
              ({path.hops.length - 1} {path.hops.length - 1 === 1 ? "hop" : "hops"})
            </span>
          </h4>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            {isHopDetailsExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Hops List */}
        {isHopDetailsExpanded && (
          <div className="max-h-96 overflow-y-auto border-t">
            {path.links.map((link, index) => {
              const sourceNode = path.hops[index];
              const destinationNode = path.hops[index + 1];

              return (
                <div
                  key={index}
                  onClick={() => onHopClick?.(index)}
                  className={cn(
                    "p-3 border-b last:border-b-0",
                    "hover:bg-accent/30 transition-colors",
                    onHopClick && "cursor-pointer",
                    // Clicked hop highlighting (blue)
                    highlightedHopIndex === index && "bg-blue-500/10 border-l-4 border-l-blue-500",
                    // Active hop highlighting (yellow/gold, pulsing) - packet traversing
                    currentHopIndex === index && "bg-yellow-500/20 border-l-4 border-l-yellow-500 animate-pulse",
                  )}
                >
                  {/* Hop number */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Hop {index + 1} of {path.links.length}
                    </div>
                  </div>

                  {/* Source → Destination */}
                  <div className="mb-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono font-medium truncate">
                        {sourceNode.name}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-mono font-medium truncate">
                        {destinationNode.name}
                      </span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Delay:</span>{" "}
                      <span className="font-medium">
                        {formatDelay(link.latencyUs / 1000)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Bandwidth:</span>{" "}
                      <span className="font-medium">
                        {formatBandwidth(link.bandwidthGbps ?? null)}
                      </span>
                    </div>
                  </div>

                  {/* Link ID */}
                  <div className="mt-1 text-xs text-muted-foreground font-mono truncate">
                    {link.id}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
