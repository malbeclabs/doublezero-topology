"use client";

/**
 * Topology Context (v2)
 *
 * Global state management for topology data with separate snapshot/ISIS tracking.
 * Supports mix-and-match workflows (e.g., S3 snapshot + manual ISIS upload).
 *
 * Version 2 Changes:
 * - Separate tracking for snapshot and ISIS data
 * - Auto-processing when both loaded for first time
 * - Manual processing when replacing data
 * - Cross-page state persistence via separate caches
 */

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import type {
  TopologyLink,
  TopologyHealthSummary,
  Location,
} from "@/types/topology";
import {
  type SnapshotData,
  type IsisData,
  type ProcessedTopologyData,
  getCachedSnapshot,
  getCachedIsis,
  getCachedProcessedTopology,
  cacheSnapshot,
  cacheIsis,
  cacheProcessedTopology,
} from "@/lib/storage/snapshot-cache";

/**
 * Processing state
 */
type ProcessingState = "idle" | "processing" | "complete" | "error";

/**
 * Topology context value
 */
interface TopologyContextValue {
  // Separate data tracking
  snapshotData: SnapshotData | null;
  isisData: IsisData | null;
  processedTopology: ProcessedTopologyData | null;

  // Processing state
  processingState: ProcessingState;
  processingError: string | null;

  // Actions
  setSnapshotData: (snapshot: SnapshotData) => Promise<void>;
  setIsisData: (isis: IsisData) => Promise<void>;
  processTopology: () => Promise<void>;
  clearSnapshot: () => void;
  clearIsis: () => void;
  clearAll: () => void;

  // Computed properties
  bothLoaded: boolean;
  needsProcessing: boolean;
  canProcess: boolean;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const TopologyContext = createContext<TopologyContextValue | undefined>(
  undefined,
);

/**
 * Topology Provider Component
 */
export function TopologyProvider({ children }: { children: ReactNode }) {
  // State
  const [snapshotData, setSnapshotDataState] = useState<SnapshotData | null>(
    () => {
      if (typeof window !== "undefined") {
        return getCachedSnapshot();
      }
      return null;
    },
  );

  const [isisData, setIsisDataState] = useState<IsisData | null>(() => {
    if (typeof window !== "undefined") {
      return getCachedIsis();
    }
    return null;
  });

  const [processedTopology, setProcessedTopologyState] =
    useState<ProcessedTopologyData | null>(() => {
      if (typeof window !== "undefined") {
        return getCachedProcessedTopology();
      }
      return null;
    });

  const [processingState, setProcessingState] =
    useState<ProcessingState>("idle");
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to access current state in async operations
  const snapshotDataRef = useRef(snapshotData);
  const isisDataRef = useRef(isisData);
  const processedTopologyRef = useRef(processedTopology);
  const processingInProgress = useRef(false);

  // Update refs when state changes
  useEffect(() => {
    snapshotDataRef.current = snapshotData;
  }, [snapshotData]);

  useEffect(() => {
    isisDataRef.current = isisData;
  }, [isisData]);

  useEffect(() => {
    processedTopologyRef.current = processedTopology;
  }, [processedTopology]);

  /**
   * Process topology from snapshot and ISIS data
   */
  const processTopology = useCallback(async () => {
    if (!snapshotDataRef.current || !isisDataRef.current) {
      throw new Error("Both snapshot and ISIS data required to process topology");
    }

    if (processingInProgress.current) {
      console.warn("[WARN] Processing already in progress, skipping");
      return;
    }

    processingInProgress.current = true;
    setProcessingState("processing");
    setProcessingError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/topology/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshot: snapshotDataRef.current,
          isis: isisDataRef.current,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Processing failed");
      }

      const processed: ProcessedTopologyData = {
        topology: result.data.topology,
        locations: result.data.locations,
        summary: result.data.summary,
        processedAt: Date.now(),
        sources: {
          snapshot: snapshotDataRef.current,
          isis: isisDataRef.current,
        },
      };

      setProcessedTopologyState(processed);
      cacheProcessedTopology(processed);
      setProcessingState("complete");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Processing failed";
      setProcessingState("error");
      setProcessingError(message);
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
      processingInProgress.current = false;
    }
  }, []);

  /**
   * Set snapshot data and auto-process if ISIS already loaded
   */
  const setSnapshotData = useCallback(async (snapshot: SnapshotData) => {
    setSnapshotDataState(snapshot);
    cacheSnapshot(snapshot);

    // Update ref immediately for synchronous access
    snapshotDataRef.current = snapshot;

    // Clear processed topology since snapshot changed
    setProcessedTopologyState(null);
    processedTopologyRef.current = null;

    // If ISIS already loaded and no processed topology, auto-process
    if (isisDataRef.current && !processedTopologyRef.current) {
      try {
        await processTopology();
      } catch (err) {
        console.error("[ERROR] Auto-processing failed:", err);
      }
    }
  }, [processTopology]);

  /**
   * Set ISIS data and auto-process if snapshot already loaded
   */
  const setIsisData = useCallback(async (isis: IsisData) => {
    setIsisDataState(isis);
    cacheIsis(isis);

    // Update ref immediately for synchronous access
    isisDataRef.current = isis;

    // Clear processed topology since ISIS changed
    setProcessedTopologyState(null);
    processedTopologyRef.current = null;

    // If snapshot already loaded and no processed topology, auto-process
    if (snapshotDataRef.current && !processedTopologyRef.current) {
      try {
        await processTopology();
      } catch (err) {
        console.error("[ERROR] Auto-processing failed:", err);
      }
    }
  }, [processTopology]);

  /**
   * Clear snapshot data
   */
  const clearSnapshot = useCallback(() => {
    setSnapshotDataState(null);
    snapshotDataRef.current = null;
    setProcessedTopologyState(null);
    processedTopologyRef.current = null;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("dztopo:snapshot:v2");
      sessionStorage.removeItem("dztopo:processed:v2");
    }
  }, []);

  /**
   * Clear ISIS data
   */
  const clearIsis = useCallback(() => {
    setIsisDataState(null);
    isisDataRef.current = null;
    setProcessedTopologyState(null);
    processedTopologyRef.current = null;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("dztopo:isis:v2");
      sessionStorage.removeItem("dztopo:processed:v2");
    }
  }, []);

  /**
   * Clear all data
   */
  const clearAll = useCallback(() => {
    setSnapshotDataState(null);
    snapshotDataRef.current = null;
    setIsisDataState(null);
    isisDataRef.current = null;
    setProcessedTopologyState(null);
    processedTopologyRef.current = null;
    setProcessingState("idle");
    setProcessingError(null);
    setError(null);

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("dztopo:snapshot:v2");
      sessionStorage.removeItem("dztopo:isis:v2");
      sessionStorage.removeItem("dztopo:processed:v2");
    }
  }, []);

  // Computed properties
  const bothLoaded = Boolean(snapshotData && isisData);
  const needsProcessing = bothLoaded && !processedTopology;
  const canProcess = bothLoaded;

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = useMemo<TopologyContextValue>(
    () => ({
      // Data
      snapshotData,
      isisData,
      processedTopology,

      // Processing state
      processingState,
      processingError,

      // Actions (stable references via useCallback)
      setSnapshotData,
      setIsisData,
      processTopology,
      clearSnapshot,
      clearIsis,
      clearAll,

      // Computed
      bothLoaded,
      needsProcessing,
      canProcess,

      // Loading states
      isLoading,
      setIsLoading,
      error,
      setError,
    }),
    [
      // Data dependencies
      snapshotData,
      isisData,
      processedTopology,
      // Processing state dependencies
      processingState,
      processingError,
      // Action dependencies (stable via useCallback)
      setSnapshotData,
      setIsisData,
      processTopology,
      clearSnapshot,
      clearIsis,
      clearAll,
      // Computed dependencies
      bothLoaded,
      needsProcessing,
      canProcess,
      // Loading state dependencies
      isLoading,
      error,
    ],
  );

  return (
    <TopologyContext.Provider value={value}>
      {children}
    </TopologyContext.Provider>
  );
}

/**
 * Hook to access topology context
 *
 * @throws Error if used outside TopologyProvider
 */
export function useTopology(): TopologyContextValue {
  const context = useContext(TopologyContext);
  if (context === undefined) {
    throw new Error("useTopology must be used within TopologyProvider");
  }
  return context;
}

// ============================================================================
// Legacy Support (Backward Compatibility)
// ============================================================================

/**
 * Legacy topology data structure (v1)
 * @deprecated Use separate snapshot/ISIS tracking instead
 */
export interface LegacyTopologyData {
  topology: TopologyLink[];
  locations: Location[];
  summary: TopologyHealthSummary;
  metadata: {
    snapshotKey: string;
    isisKey: string;
    processedAt: string;
    epoch: number | null;
    dataSource: "s3" | "upload" | null;
    lastUpdated: number | null;
    snapshotSize: number | null;
  };
}

/**
 * Convert legacy topology data to v2 format
 * @deprecated Used for migration only
 */
export function migrateLegacyData(legacy: LegacyTopologyData): {
  processed: ProcessedTopologyData;
  snapshot: SnapshotData;
  isis: IsisData;
} {
  const snapshot: SnapshotData = {
    data: { legacy: true },
    source: legacy.metadata.dataSource || "upload",
    epoch: legacy.metadata.epoch,
    timestamp: legacy.metadata.lastUpdated || Date.now(),
    size: legacy.metadata.snapshotSize || 0,
    filename: legacy.metadata.snapshotKey,
  };

  const isis: IsisData = {
    data: { legacy: true },
    source: legacy.metadata.dataSource || "upload",
    filename: legacy.metadata.isisKey,
    timestamp: legacy.metadata.lastUpdated || Date.now(),
    size: 0,
  };

  const processed: ProcessedTopologyData = {
    topology: legacy.topology,
    locations: legacy.locations,
    summary: legacy.summary,
    processedAt: new Date(legacy.metadata.processedAt).getTime(),
    sources: { snapshot, isis },
  };

  return { processed, snapshot, isis };
}
