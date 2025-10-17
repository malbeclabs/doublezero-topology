"use client";

/**
 * Topology Context
 *
 * Global state management for processed topology data.
 * Stores results from topology API after file upload/processing.
 *
 * Usage:
 * - Wrap app with <TopologyProvider>
 * - Use useTopology() hook to access topology data
 * - Call setTopologyData() after processing completes
 */

import { createContext, useContext, useState, ReactNode } from "react";
import type { TopologyLink, TopologyHealthSummary, Location } from "@/types/topology";

/**
 * Topology data structure
 */
interface TopologyData {
  topology: TopologyLink[];
  locations: Location[];
  summary: TopologyHealthSummary;
  metadata: {
    snapshotKey: string;
    isisKey: string;
    processedAt: string;
  };
}

/**
 * Topology context value
 */
interface TopologyContextValue {
  topologyData: TopologyData | null;
  setTopologyData: (data: TopologyData | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const TopologyContext = createContext<TopologyContextValue | undefined>(
  undefined
);

/**
 * Topology Provider Component
 */
export function TopologyProvider({ children }: { children: ReactNode }) {
  const [topologyData, setTopologyData] = useState<TopologyData | null>(() => {
    // Initialize from sessionStorage on mount (persists across page navigation, cleared on tab close)
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('topology_data');
        return stored ? JSON.parse(stored) : null;
      } catch (error) {
        console.error('Failed to load topology data from sessionStorage:', error);
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom setter that also persists to sessionStorage
  const setTopologyDataWithPersistence = (data: TopologyData | null) => {
    setTopologyData(data);
    if (typeof window !== 'undefined') {
      try {
        if (data === null) {
          sessionStorage.removeItem('topology_data');
        } else {
          sessionStorage.setItem('topology_data', JSON.stringify(data));
        }
      } catch (error) {
        console.error('Failed to save topology data to sessionStorage:', error);
      }
    }
  };

  return (
    <TopologyContext.Provider
      value={{
        topologyData,
        setTopologyData: setTopologyDataWithPersistence,
        isLoading,
        setIsLoading,
        error,
        setError,
      }}
    >
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
