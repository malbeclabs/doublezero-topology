/**
 * Map Filter Store
 *
 * Zustand store for managing map view filters including:
 * - Bandwidth tier filtering
 * - Health status filtering
 * - Drift range filtering
 * - Data completeness filtering
 * - Search query
 */

import { create } from "zustand";
import type { HealthStatus, DataCompleteness } from "@/types/topology";

interface DriftRange {
  min: number;
  max: number;
}

interface MapFilterState {
  // Filter states
  bandwidthTiers: Set<number>;
  healthStatuses: Set<HealthStatus>;
  driftRange: DriftRange;
  dataStatuses: Set<DataCompleteness>;
  searchQuery: string;

  // Actions
  toggleBandwidthTier: (tier: number) => void;
  toggleHealthStatus: (status: HealthStatus) => void;
  setDriftRange: (min: number, max: number) => void;
  toggleDataStatus: (status: DataCompleteness) => void;
  setSearchQuery: (query: string) => void;
  clearAllFilters: () => void;
  isFilteringActive: () => boolean;
}

// Default filter states (INVERTED LOGIC: empty = show all, populated = show only selected)
const DEFAULT_BANDWIDTH_TIER: number | null = null; // null = show all
const DEFAULT_HEALTH_STATUSES = new Set<HealthStatus>(); // empty = show all
const DEFAULT_DATA_STATUSES = new Set<DataCompleteness>(); // empty = show all
const DEFAULT_DRIFT_RANGE: DriftRange = { min: 0, max: 100 };

export const useMapFilterStore = create<MapFilterState>((set, get) => ({
  // Initialize with empty filters (show everything by default)
  bandwidthTiers: new Set<number>(), // Changed to Set for consistency, but will use single value logic
  healthStatuses: new Set(DEFAULT_HEALTH_STATUSES),
  driftRange: { ...DEFAULT_DRIFT_RANGE },
  dataStatuses: new Set(DEFAULT_DATA_STATUSES),
  searchQuery: "",

  // Toggle bandwidth tier filter
  toggleBandwidthTier: (tier: number) => {
    set((state) => {
      const newTiers = new Set(state.bandwidthTiers);
      if (newTiers.has(tier)) {
        newTiers.delete(tier);
      } else {
        newTiers.add(tier);
      }
      return { bandwidthTiers: newTiers };
    });
  },

  // Toggle health status filter
  toggleHealthStatus: (status: HealthStatus) => {
    set((state) => {
      const newStatuses = new Set(state.healthStatuses);
      if (newStatuses.has(status)) {
        newStatuses.delete(status);
      } else {
        newStatuses.add(status);
      }
      return { healthStatuses: newStatuses };
    });
  },

  // Set drift range filter
  setDriftRange: (min: number, max: number) => {
    set({ driftRange: { min, max } });
  },

  // Toggle data status filter
  toggleDataStatus: (status: DataCompleteness) => {
    set((state) => {
      const newStatuses = new Set(state.dataStatuses);
      if (newStatuses.has(status)) {
        newStatuses.delete(status);
      } else {
        newStatuses.add(status);
      }
      return { dataStatuses: newStatuses };
    });
  },

  // Set search query
  setSearchQuery: (query: string) => {
    set({ searchQuery: query.trim() });
  },

  // Clear all filters
  clearAllFilters: () => {
    set({
      bandwidthTiers: new Set<number>(),
      healthStatuses: new Set(DEFAULT_HEALTH_STATUSES),
      driftRange: { ...DEFAULT_DRIFT_RANGE },
      dataStatuses: new Set(DEFAULT_DATA_STATUSES),
      searchQuery: "",
    });
  },

  // Check if any filtering is active (INVERTED LOGIC: any non-empty Set = active)
  isFilteringActive: () => {
    const state = get();

    // Check if bandwidth tiers are filtered (any selection = filtering)
    if (state.bandwidthTiers.size > 0) {
      return true;
    }

    // Check if health statuses are filtered (any selection = filtering)
    if (state.healthStatuses.size > 0) {
      return true;
    }

    // Check if drift range is modified
    if (state.driftRange.min !== 0 || state.driftRange.max !== 100) {
      return true;
    }

    // Check if data statuses are filtered (any selection = filtering)
    if (state.dataStatuses.size > 0) {
      return true;
    }

    // Check if search query is present
    if (state.searchQuery !== "") {
      return true;
    }

    return false;
  },
}));
