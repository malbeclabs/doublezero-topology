/**
 * Path Computation Store
 *
 * Zustand store for managing shortest path computation state including:
 * - Source and destination node selection
 * - Computed network paths
 * - Weighting strategy selection
 * - Path computation status
 */

import { create } from "zustand";
import type { NetworkPath, WeightingStrategy } from "@/lib/graph/types";

interface PathComputationState {
  // Selection state
  sourceNodeId: string | null;
  destinationNodeId: string | null;

  // Weighting strategy
  weightingStrategy: WeightingStrategy;

  // Computed path
  computedPath: NetworkPath | null;

  // Computation state
  isComputing: boolean;
  error: string | null;

  // Actions
  setSourceNode: (nodeId: string | null) => void;
  setDestinationNode: (nodeId: string | null) => void;
  setWeightingStrategy: (strategy: WeightingStrategy) => void;
  setComputedPath: (path: NetworkPath | null) => void;
  setIsComputing: (isComputing: boolean) => void;
  setError: (error: string | null) => void;
  clearPath: () => void;
  clearSelection: () => void;
  reset: () => void;

  // Computed properties
  canComputePath: () => boolean;
  hasPath: () => boolean;
}

export const usePathStore = create<PathComputationState>((set, get) => ({
  // Initial state
  sourceNodeId: null,
  destinationNodeId: null,
  weightingStrategy: "latency", // Default to latency-based routing
  computedPath: null,
  isComputing: false,
  error: null,

  // Set source node
  setSourceNode: (nodeId: string | null) => {
    set({ sourceNodeId: nodeId, error: null });
  },

  // Set destination node
  setDestinationNode: (nodeId: string | null) => {
    set({ destinationNodeId: nodeId, error: null });
  },

  // Set weighting strategy
  setWeightingStrategy: (strategy: WeightingStrategy) => {
    set({ weightingStrategy: strategy, computedPath: null, error: null });
  },

  // Set computed path
  setComputedPath: (path: NetworkPath | null) => {
    set({ computedPath: path, isComputing: false, error: null });
  },

  // Set computing state
  setIsComputing: (isComputing: boolean) => {
    set({ isComputing, error: isComputing ? null : get().error });
  },

  // Set error
  setError: (error: string | null) => {
    set({ error, isComputing: false });
  },

  // Clear computed path (keep selection)
  clearPath: () => {
    set({ computedPath: null, error: null });
  },

  // Clear source and destination selection (keep path if exists)
  clearSelection: () => {
    set({ sourceNodeId: null, destinationNodeId: null, error: null });
  },

  // Reset all state
  reset: () => {
    set({
      sourceNodeId: null,
      destinationNodeId: null,
      weightingStrategy: "latency",
      computedPath: null,
      isComputing: false,
      error: null,
    });
  },

  // Check if path can be computed (both nodes selected)
  canComputePath: () => {
    const state = get();
    return state.sourceNodeId !== null && state.destinationNodeId !== null;
  },

  // Check if a path has been computed
  hasPath: () => {
    return get().computedPath !== null;
  },
}));
