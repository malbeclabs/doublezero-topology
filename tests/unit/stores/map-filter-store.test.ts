/**
 * Unit tests for map filter store
 * Following TDD: Tests written before implementation
 *
 * Includes:
 * - Basic functionality tests
 * - Zustand selector isolation tests (verifying granular subscriptions)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useMapFilterStore } from "@/lib/stores/map-filter-store";
import type { HealthStatus, DataCompleteness } from "@/types/topology";

describe("Map Filter Store", () => {

  beforeEach(() => {
    // Reset store before each test
    if (useMapFilterStore) {
      const { clearAllFilters } = useMapFilterStore.getState();
      clearAllFilters();
    }
  });

  describe("Bandwidth tier filtering (INVERTED LOGIC)", () => {
    it("should initialize with NO bandwidth tiers selected (show all)", () => {
      const { bandwidthTiers } = useMapFilterStore.getState();
      expect(bandwidthTiers.size).toBe(0);
    });

    it("should toggle bandwidth tier on/off (add = filter, remove = unfilter)", () => {
      const { toggleBandwidthTier } = useMapFilterStore.getState();

      // First toggle: ADD tier (start filtering)
      toggleBandwidthTier(10);
      const after = useMapFilterStore.getState().bandwidthTiers;
      expect(after.has(10)).toBe(true);
      expect(after.size).toBe(1);

      // Second toggle: REMOVE tier (stop filtering)
      toggleBandwidthTier(10);
      const final = useMapFilterStore.getState().bandwidthTiers;
      expect(final.has(10)).toBe(false);
      expect(final.size).toBe(0);
    });

    it("should handle toggling multiple tiers (additive filtering)", () => {
      const { toggleBandwidthTier } = useMapFilterStore.getState();

      toggleBandwidthTier(10);
      toggleBandwidthTier(50);

      const { bandwidthTiers } = useMapFilterStore.getState();
      expect(bandwidthTiers.has(10)).toBe(true);
      expect(bandwidthTiers.has(50)).toBe(true);
      expect(bandwidthTiers.has(100)).toBe(false);
      expect(bandwidthTiers.has(200)).toBe(false);
      expect(bandwidthTiers.size).toBe(2);
    });
  });

  describe("Health status filtering (INVERTED LOGIC)", () => {
    it("should initialize with NO health statuses selected (show all)", () => {
      const { healthStatuses } = useMapFilterStore.getState();
      expect(healthStatuses.size).toBe(0);
    });

    it("should toggle health status on/off (add = filter, remove = unfilter)", () => {
      const { toggleHealthStatus } = useMapFilterStore.getState();

      // First toggle: ADD status (start filtering)
      toggleHealthStatus("HEALTHY");
      const after = useMapFilterStore.getState().healthStatuses;
      expect(after.has("HEALTHY")).toBe(true);
      expect(after.size).toBe(1);

      // Second toggle: REMOVE status (stop filtering)
      toggleHealthStatus("HEALTHY");
      const final = useMapFilterStore.getState().healthStatuses;
      expect(final.has("HEALTHY")).toBe(false);
      expect(final.size).toBe(0);
    });
  });

  describe("Drift range filtering", () => {
    it("should initialize with full drift range (0-100)", () => {
      const { driftRange } = useMapFilterStore.getState();
      expect(driftRange.min).toBe(0);
      expect(driftRange.max).toBe(100);
    });

    it("should update drift range", () => {
      const { setDriftRange } = useMapFilterStore.getState();

      setDriftRange(10, 50);
      const { driftRange } = useMapFilterStore.getState();
      expect(driftRange.min).toBe(10);
      expect(driftRange.max).toBe(50);
    });

    it("should handle edge cases for drift range", () => {
      const { setDriftRange } = useMapFilterStore.getState();

      setDriftRange(0, 0);
      let { driftRange } = useMapFilterStore.getState();
      expect(driftRange.min).toBe(0);
      expect(driftRange.max).toBe(0);

      setDriftRange(100, 100);
      driftRange = useMapFilterStore.getState().driftRange;
      expect(driftRange.min).toBe(100);
      expect(driftRange.max).toBe(100);
    });
  });

  describe("Data completeness filtering (INVERTED LOGIC)", () => {
    it("should initialize with NO data statuses selected (show all)", () => {
      const { dataStatuses } = useMapFilterStore.getState();
      expect(dataStatuses.size).toBe(0);
    });

    it("should toggle data status on/off (add = filter, remove = unfilter)", () => {
      const { toggleDataStatus } = useMapFilterStore.getState();

      // First toggle: ADD status (start filtering)
      toggleDataStatus("COMPLETE" as DataCompleteness);
      const after = useMapFilterStore.getState().dataStatuses;
      expect(after.has("COMPLETE")).toBe(true);
      expect(after.size).toBe(1);

      // Second toggle: REMOVE status (stop filtering)
      toggleDataStatus("COMPLETE" as DataCompleteness);
      const final = useMapFilterStore.getState().dataStatuses;
      expect(final.has("COMPLETE")).toBe(false);
      expect(final.size).toBe(0);
    });
  });

  describe("Search filtering", () => {
    it("should initialize with empty search query", () => {
      const { searchQuery } = useMapFilterStore.getState();
      expect(searchQuery).toBe("");
    });

    it("should update search query", () => {
      const { setSearchQuery } = useMapFilterStore.getState();

      setSearchQuery("test-link");
      const { searchQuery } = useMapFilterStore.getState();
      expect(searchQuery).toBe("test-link");
    });

    it("should trim search query", () => {
      const { setSearchQuery } = useMapFilterStore.getState();

      setSearchQuery("  test-link  ");
      const { searchQuery } = useMapFilterStore.getState();
      expect(searchQuery).toBe("test-link");
    });
  });

  describe("Clear all filters", () => {
    it("should reset all filters to default state (INVERTED: empty Sets)", () => {
      const {
        toggleBandwidthTier,
        toggleHealthStatus,
        setDriftRange,
        toggleDataStatus,
        setSearchQuery,
        clearAllFilters
      } = useMapFilterStore.getState();

      // Apply some filters
      toggleBandwidthTier(10);
      toggleHealthStatus("HEALTHY");
      setDriftRange(10, 50);
      toggleDataStatus("COMPLETE" as DataCompleteness);
      setSearchQuery("test");

      // Clear all
      clearAllFilters();

      const state = useMapFilterStore.getState();

      // All should be back to defaults (INVERTED: empty = show all)
      expect(state.bandwidthTiers.size).toBe(0);
      expect(state.healthStatuses.size).toBe(0);
      expect(state.driftRange.min).toBe(0);
      expect(state.driftRange.max).toBe(100);
      expect(state.dataStatuses.size).toBe(0);
      expect(state.searchQuery).toBe("");
    });
  });

  describe("Is filtering active (INVERTED LOGIC)", () => {
    it("should return false when all filters are at defaults (empty Sets)", () => {
      const { isFilteringActive } = useMapFilterStore.getState();
      expect(isFilteringActive()).toBe(false);
    });

    it("should return true when bandwidth filter is active (Set has items)", () => {
      const { toggleBandwidthTier, isFilteringActive } = useMapFilterStore.getState();

      toggleBandwidthTier(10);
      expect(isFilteringActive()).toBe(true);
    });

    it("should return true when health status filter is active (Set has items)", () => {
      const { toggleHealthStatus, isFilteringActive } = useMapFilterStore.getState();

      toggleHealthStatus("HEALTHY");
      expect(isFilteringActive()).toBe(true);
    });

    it("should return true when drift range is modified", () => {
      const { setDriftRange, isFilteringActive } = useMapFilterStore.getState();

      setDriftRange(0, 50);
      expect(isFilteringActive()).toBe(true);
    });

    it("should return true when data status filter is active (Set has items)", () => {
      const { toggleDataStatus, isFilteringActive } = useMapFilterStore.getState();

      toggleDataStatus("COMPLETE" as DataCompleteness);
      expect(isFilteringActive()).toBe(true);
    });

    it("should return true when search query is present", () => {
      const { setSearchQuery, isFilteringActive } = useMapFilterStore.getState();

      setSearchQuery("test");
      expect(isFilteringActive()).toBe(true);
    });
  });

  describe("Zustand selector patterns - granular subscriptions", () => {
    /**
     * These tests verify that Zustand selectors properly isolate updates.
     * When using granular selectors like:
     *   const bandwidthTiers = useMapFilterStore((state) => state.bandwidthTiers);
     * Components should only re-render when that specific slice changes.
     */

    it("should allow granular state selection via getState", () => {
      // Direct property access should work
      const { bandwidthTiers } = useMapFilterStore.getState();
      expect(bandwidthTiers).toBeInstanceOf(Set);

      const { healthStatuses } = useMapFilterStore.getState();
      expect(healthStatuses).toBeInstanceOf(Set);

      const { driftRange } = useMapFilterStore.getState();
      expect(driftRange).toHaveProperty("min");
      expect(driftRange).toHaveProperty("max");
    });

    it("should maintain independent state slices", () => {
      const { toggleBandwidthTier, toggleHealthStatus, setSearchQuery } =
        useMapFilterStore.getState();

      // Modify one slice
      toggleBandwidthTier(10);

      // Get state and verify only that slice changed
      const state = useMapFilterStore.getState();
      expect(state.bandwidthTiers.has(10)).toBe(true);
      expect(state.healthStatuses.size).toBe(0); // Unchanged
      expect(state.searchQuery).toBe(""); // Unchanged

      // Modify another slice
      toggleHealthStatus("HEALTHY");

      const state2 = useMapFilterStore.getState();
      expect(state2.bandwidthTiers.has(10)).toBe(true); // Still set
      expect(state2.healthStatuses.has("HEALTHY")).toBe(true); // Now set
      expect(state2.searchQuery).toBe(""); // Still unchanged

      // Modify third slice
      setSearchQuery("test");

      const state3 = useMapFilterStore.getState();
      expect(state3.bandwidthTiers.has(10)).toBe(true);
      expect(state3.healthStatuses.has("HEALTHY")).toBe(true);
      expect(state3.searchQuery).toBe("test"); // Now set
    });

    it("should support subscribe for specific slice changes", () => {
      const { toggleBandwidthTier, toggleHealthStatus } =
        useMapFilterStore.getState();

      // Track calls to subscriber
      let callCount = 0;
      let lastBandwidthTiers: Set<number> | null = null;

      // Subscribe to changes using selector pattern
      const unsubscribe = useMapFilterStore.subscribe(
        (state) => {
          callCount++;
          lastBandwidthTiers = state.bandwidthTiers;
        }
      );

      // Initial subscription doesn't fire
      expect(callCount).toBe(0);

      // Modify bandwidthTiers
      toggleBandwidthTier(10);
      expect(callCount).toBe(1);
      expect(lastBandwidthTiers?.has(10)).toBe(true);

      // Modify healthStatuses (subscriber still fires - full subscribe)
      // Note: For true granular subscriptions, components use selectors
      toggleHealthStatus("HEALTHY");
      expect(callCount).toBe(2);

      unsubscribe();
    });

    it("should properly isolate Set mutations (immutability)", () => {
      const { toggleBandwidthTier } = useMapFilterStore.getState();

      // Get initial reference
      const initialTiers = useMapFilterStore.getState().bandwidthTiers;
      expect(initialTiers.size).toBe(0);

      // Mutate
      toggleBandwidthTier(10);

      // Get new reference
      const newTiers = useMapFilterStore.getState().bandwidthTiers;

      // References should be different (new Set created)
      expect(newTiers).not.toBe(initialTiers);
      expect(newTiers.has(10)).toBe(true);
      expect(initialTiers.has(10)).toBe(false); // Original unchanged
    });

    it("should properly isolate object mutations (driftRange)", () => {
      const { setDriftRange } = useMapFilterStore.getState();

      // Get initial reference
      const initialRange = useMapFilterStore.getState().driftRange;
      expect(initialRange.min).toBe(0);
      expect(initialRange.max).toBe(100);

      // Mutate
      setDriftRange(10, 50);

      // Get new reference
      const newRange = useMapFilterStore.getState().driftRange;

      // References should be different (new object created)
      expect(newRange).not.toBe(initialRange);
      expect(newRange.min).toBe(10);
      expect(newRange.max).toBe(50);
      expect(initialRange.min).toBe(0); // Original unchanged
      expect(initialRange.max).toBe(100); // Original unchanged
    });

    it("should allow selector-based access patterns", () => {
      // Simulate selector pattern used by React components:
      // const bandwidthTiers = useMapFilterStore(state => state.bandwidthTiers);

      const selectBandwidthTiers = (state: ReturnType<typeof useMapFilterStore.getState>) =>
        state.bandwidthTiers;
      const selectHealthStatuses = (state: ReturnType<typeof useMapFilterStore.getState>) =>
        state.healthStatuses;
      const selectSearchQuery = (state: ReturnType<typeof useMapFilterStore.getState>) =>
        state.searchQuery;

      // Use selectors
      const bandwidthTiers = selectBandwidthTiers(useMapFilterStore.getState());
      const healthStatuses = selectHealthStatuses(useMapFilterStore.getState());
      const searchQuery = selectSearchQuery(useMapFilterStore.getState());

      expect(bandwidthTiers).toBeInstanceOf(Set);
      expect(healthStatuses).toBeInstanceOf(Set);
      expect(typeof searchQuery).toBe("string");
    });

    it("should maintain action function stability", () => {
      // Get actions twice
      const actions1 = useMapFilterStore.getState();
      const actions2 = useMapFilterStore.getState();

      // Actions should be the same reference (Zustand provides stable references)
      expect(actions1.toggleBandwidthTier).toBe(actions2.toggleBandwidthTier);
      expect(actions1.toggleHealthStatus).toBe(actions2.toggleHealthStatus);
      expect(actions1.setDriftRange).toBe(actions2.setDriftRange);
      expect(actions1.toggleDataStatus).toBe(actions2.toggleDataStatus);
      expect(actions1.setSearchQuery).toBe(actions2.setSearchQuery);
      expect(actions1.clearAllFilters).toBe(actions2.clearAllFilters);
      expect(actions1.isFilteringActive).toBe(actions2.isFilteringActive);
    });
  });

  describe("State isolation for component re-renders", () => {
    /**
     * These tests verify the patterns that prevent unnecessary re-renders
     * in components using the store.
     */

    it("should produce new state object only when values actually change", () => {
      const { setSearchQuery, clearAllFilters } = useMapFilterStore.getState();

      // Set initial value
      setSearchQuery("test");
      const state1 = useMapFilterStore.getState();

      // Set same value again
      setSearchQuery("test");
      const state2 = useMapFilterStore.getState();

      // searchQuery should be equal (same value)
      expect(state1.searchQuery).toBe(state2.searchQuery);

      // Clear and verify
      clearAllFilters();
      const state3 = useMapFilterStore.getState();
      expect(state3.searchQuery).toBe("");
    });

    it("should allow multiple filter combinations independently", () => {
      const {
        toggleBandwidthTier,
        toggleHealthStatus,
        setDriftRange,
        toggleDataStatus,
        setSearchQuery,
      } = useMapFilterStore.getState();

      // Set multiple filters
      toggleBandwidthTier(10);
      toggleBandwidthTier(50);
      toggleHealthStatus("HEALTHY");
      toggleHealthStatus("DRIFT_HIGH");
      setDriftRange(5, 80);
      toggleDataStatus("COMPLETE" as DataCompleteness);
      setSearchQuery("link-");

      // Verify all are set
      const state = useMapFilterStore.getState();
      expect(state.bandwidthTiers.size).toBe(2);
      expect(state.bandwidthTiers.has(10)).toBe(true);
      expect(state.bandwidthTiers.has(50)).toBe(true);
      expect(state.healthStatuses.size).toBe(2);
      expect(state.healthStatuses.has("HEALTHY")).toBe(true);
      expect(state.healthStatuses.has("DRIFT_HIGH")).toBe(true);
      expect(state.driftRange.min).toBe(5);
      expect(state.driftRange.max).toBe(80);
      expect(state.dataStatuses.size).toBe(1);
      expect(state.dataStatuses.has("COMPLETE")).toBe(true);
      expect(state.searchQuery).toBe("link-");
      expect(state.isFilteringActive()).toBe(true);
    });
  });
});
