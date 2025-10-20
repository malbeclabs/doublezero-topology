/**
 * Map Mode Store
 *
 * Zustand store for managing the map's operational mode and device selection state.
 * Supports three modes:
 * - exploration: Default mode for browsing links and topology
 * - path-planning: Interactive device selection for route planning
 * - path-active: Viewing computed path with details
 */

import { create } from "zustand";

export type MapMode = "exploration" | "path-planning" | "path-active";

export type SelectionStep = "source" | "destination" | "complete";

interface MapModeState {
  // Mode state
  mode: MapMode;
  previousMode: MapMode | null;

  // Device selection state (for path planning)
  sourceDeviceId: string | null;
  destinationDeviceId: string | null;
  selectionStep: SelectionStep;

  // Transition state
  isTransitioning: boolean;
  transitionDuration: number; // milliseconds

  // Actions - Mode transitions
  enterPathPlanningMode: () => void;
  enterPathActiveMode: () => void;
  exitToExplorationMode: () => void;
  setMode: (mode: MapMode) => void;

  // Actions - Device selection
  selectSourceDevice: (deviceId: string) => void;
  selectDestinationDevice: (deviceId: string) => void;
  clearDeviceSelection: () => void;
  clearSourceDevice: () => void;
  clearDestinationDevice: () => void;

  // Actions - Reset
  reset: () => void;

  // Computed properties
  isExplorationMode: () => boolean;
  isPathPlanningMode: () => boolean;
  isPathActiveMode: () => boolean;
  hasSourceSelected: () => boolean;
  hasDestinationSelected: () => boolean;
  hasBothDevicesSelected: () => boolean;
}

const INITIAL_STATE = {
  mode: "exploration" as MapMode,
  previousMode: null,
  sourceDeviceId: null,
  destinationDeviceId: null,
  selectionStep: "source" as SelectionStep,
  isTransitioning: false,
  transitionDuration: 300, // 300ms default transition
};

export const useMapModeStore = create<MapModeState>((set, get) => ({
  // Initial state
  ...INITIAL_STATE,

  // Mode transition: Enter path planning mode
  enterPathPlanningMode: () => {
    const currentMode = get().mode;

    set({
      mode: "path-planning",
      previousMode: currentMode,
      isTransitioning: true,
      // Clear any previous device selection
      sourceDeviceId: null,
      destinationDeviceId: null,
      selectionStep: "source",
    });

    // Clear transition flag after animation
    setTimeout(() => {
      set({ isTransitioning: false });
    }, get().transitionDuration);
  },

  // Mode transition: Enter path active mode (after path computed)
  enterPathActiveMode: () => {
    const currentMode = get().mode;

    set({
      mode: "path-active",
      previousMode: currentMode,
      isTransitioning: true,
      selectionStep: "complete",
    });

    // Clear transition flag after animation
    setTimeout(() => {
      set({ isTransitioning: false });
    }, get().transitionDuration);
  },

  // Mode transition: Exit to exploration mode
  exitToExplorationMode: () => {
    set({
      mode: "exploration",
      previousMode: get().mode,
      isTransitioning: true,
      // Clear device selection
      sourceDeviceId: null,
      destinationDeviceId: null,
      selectionStep: "source",
    });

    // Clear transition flag after animation
    setTimeout(() => {
      set({ isTransitioning: false });
    }, get().transitionDuration);
  },

  // Direct mode setter (for advanced use cases)
  setMode: (mode: MapMode) => {
    set({
      mode,
      previousMode: get().mode,
      isTransitioning: true,
    });

    setTimeout(() => {
      set({ isTransitioning: false });
    }, get().transitionDuration);
  },

  // Select source device
  selectSourceDevice: (deviceId: string) => {
    set({
      sourceDeviceId: deviceId,
      selectionStep: "destination",
    });
  },

  // Select destination device
  selectDestinationDevice: (deviceId: string) => {
    set({
      destinationDeviceId: deviceId,
      selectionStep: "complete",
    });
  },

  // Clear both device selections
  clearDeviceSelection: () => {
    set({
      sourceDeviceId: null,
      destinationDeviceId: null,
      selectionStep: "source",
    });
  },

  // Clear only source device
  clearSourceDevice: () => {
    set({
      sourceDeviceId: null,
      selectionStep: "source",
    });
  },

  // Clear only destination device
  clearDestinationDevice: () => {
    set({
      destinationDeviceId: null,
      selectionStep: get().sourceDeviceId ? "destination" : "source",
    });
  },

  // Reset to initial state
  reset: () => {
    set(INITIAL_STATE);
  },

  // Computed: Is in exploration mode?
  isExplorationMode: () => get().mode === "exploration",

  // Computed: Is in path planning mode?
  isPathPlanningMode: () => get().mode === "path-planning",

  // Computed: Is in path active mode?
  isPathActiveMode: () => get().mode === "path-active",

  // Computed: Has source device selected?
  hasSourceSelected: () => get().sourceDeviceId !== null,

  // Computed: Has destination device selected?
  hasDestinationSelected: () => get().destinationDeviceId !== null,

  // Computed: Has both devices selected?
  hasBothDevicesSelected: () =>
    get().sourceDeviceId !== null && get().destinationDeviceId !== null,
}));
