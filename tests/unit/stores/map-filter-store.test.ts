/**
 * Unit tests for map filter store
 * Following TDD: Tests written before implementation
 */

import { describe, it, expect, beforeEach } from "vitest";
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
});
