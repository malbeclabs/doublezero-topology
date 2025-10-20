/**
 * Tests for Map Mode Store
 *
 * Tests the mode management and device selection state for the map interface.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useMapModeStore } from "@/lib/stores/map-mode-store";

describe("useMapModeStore", () => {
  // Reset store before each test
  beforeEach(() => {
    useMapModeStore.getState().reset();
  });

  // Clean up timers after each test
  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("Initial State", () => {
    it("should start in exploration mode", () => {
      const { mode } = useMapModeStore.getState();
      expect(mode).toBe("exploration");
    });

    it("should have no previous mode initially", () => {
      const { previousMode } = useMapModeStore.getState();
      expect(previousMode).toBeNull();
    });

    it("should have no devices selected", () => {
      const { sourceDeviceId, destinationDeviceId } = useMapModeStore.getState();
      expect(sourceDeviceId).toBeNull();
      expect(destinationDeviceId).toBeNull();
    });

    it("should be at source selection step", () => {
      const { selectionStep } = useMapModeStore.getState();
      expect(selectionStep).toBe("source");
    });

    it("should not be transitioning", () => {
      const { isTransitioning } = useMapModeStore.getState();
      expect(isTransitioning).toBe(false);
    });

    it("should have default transition duration of 300ms", () => {
      const { transitionDuration } = useMapModeStore.getState();
      expect(transitionDuration).toBe(300);
    });
  });

  describe("Mode Transitions", () => {
    describe("enterPathPlanningMode", () => {
      it("should change mode to path-planning", () => {
        const { enterPathPlanningMode } = useMapModeStore.getState();
        enterPathPlanningMode();

        const { mode } = useMapModeStore.getState();
        expect(mode).toBe("path-planning");
      });

      it("should set previous mode to exploration", () => {
        const { enterPathPlanningMode } = useMapModeStore.getState();
        enterPathPlanningMode();

        const { previousMode } = useMapModeStore.getState();
        expect(previousMode).toBe("exploration");
      });

      it("should clear device selection when entering", () => {
        const { selectSourceDevice, selectDestinationDevice, enterPathPlanningMode } =
          useMapModeStore.getState();

        // Select devices first
        selectSourceDevice("device-a");
        selectDestinationDevice("device-b");

        // Enter path planning mode
        enterPathPlanningMode();

        const { sourceDeviceId, destinationDeviceId } = useMapModeStore.getState();
        expect(sourceDeviceId).toBeNull();
        expect(destinationDeviceId).toBeNull();
      });

      it("should reset selection step to source", () => {
        const { selectSourceDevice, enterPathPlanningMode } = useMapModeStore.getState();

        // Move to destination step
        selectSourceDevice("device-a");
        expect(useMapModeStore.getState().selectionStep).toBe("destination");

        // Enter path planning mode
        enterPathPlanningMode();

        const { selectionStep } = useMapModeStore.getState();
        expect(selectionStep).toBe("source");
      });

      it("should set isTransitioning to true initially", () => {
        vi.useFakeTimers();
        const { enterPathPlanningMode } = useMapModeStore.getState();

        enterPathPlanningMode();

        const { isTransitioning } = useMapModeStore.getState();
        expect(isTransitioning).toBe(true);

        vi.useRealTimers();
      });

      it("should clear isTransitioning after transition duration", () => {
        vi.useFakeTimers();
        const { enterPathPlanningMode } = useMapModeStore.getState();

        enterPathPlanningMode();
        expect(useMapModeStore.getState().isTransitioning).toBe(true);

        // Fast-forward past transition duration
        vi.advanceTimersByTime(300);

        expect(useMapModeStore.getState().isTransitioning).toBe(false);

        vi.useRealTimers();
      });
    });

    describe("enterPathActiveMode", () => {
      it("should change mode to path-active", () => {
        const { enterPathActiveMode } = useMapModeStore.getState();
        enterPathActiveMode();

        const { mode } = useMapModeStore.getState();
        expect(mode).toBe("path-active");
      });

      it("should preserve device selection", () => {
        const { selectSourceDevice, selectDestinationDevice, enterPathActiveMode } =
          useMapModeStore.getState();

        // Select devices
        selectSourceDevice("device-a");
        selectDestinationDevice("device-b");

        // Enter path active mode
        enterPathActiveMode();

        const { sourceDeviceId, destinationDeviceId } = useMapModeStore.getState();
        expect(sourceDeviceId).toBe("device-a");
        expect(destinationDeviceId).toBe("device-b");
      });

      it("should set selection step to complete", () => {
        const { enterPathActiveMode } = useMapModeStore.getState();
        enterPathActiveMode();

        const { selectionStep } = useMapModeStore.getState();
        expect(selectionStep).toBe("complete");
      });
    });

    describe("exitToExplorationMode", () => {
      it("should change mode to exploration", () => {
        const { enterPathPlanningMode, exitToExplorationMode } = useMapModeStore.getState();

        // Enter path planning first
        enterPathPlanningMode();
        expect(useMapModeStore.getState().mode).toBe("path-planning");

        // Exit to exploration
        exitToExplorationMode();

        const { mode } = useMapModeStore.getState();
        expect(mode).toBe("exploration");
      });

      it("should clear device selection", () => {
        const { selectSourceDevice, selectDestinationDevice, exitToExplorationMode } =
          useMapModeStore.getState();

        // Select devices
        selectSourceDevice("device-a");
        selectDestinationDevice("device-b");

        // Exit to exploration
        exitToExplorationMode();

        const { sourceDeviceId, destinationDeviceId } = useMapModeStore.getState();
        expect(sourceDeviceId).toBeNull();
        expect(destinationDeviceId).toBeNull();
      });

      it("should reset selection step", () => {
        const { exitToExplorationMode } = useMapModeStore.getState();
        exitToExplorationMode();

        const { selectionStep } = useMapModeStore.getState();
        expect(selectionStep).toBe("source");
      });
    });

    describe("setMode", () => {
      it("should allow direct mode change", () => {
        const { setMode } = useMapModeStore.getState();
        setMode("path-active");

        const { mode } = useMapModeStore.getState();
        expect(mode).toBe("path-active");
      });

      it("should track previous mode", () => {
        const { enterPathPlanningMode, setMode } = useMapModeStore.getState();

        // Enter path planning
        enterPathPlanningMode();

        // Change to path active
        setMode("path-active");

        const { previousMode } = useMapModeStore.getState();
        expect(previousMode).toBe("path-planning");
      });
    });
  });

  describe("Device Selection", () => {
    describe("selectSourceDevice", () => {
      it("should set source device ID", () => {
        const { selectSourceDevice } = useMapModeStore.getState();
        selectSourceDevice("device-a");

        const { sourceDeviceId } = useMapModeStore.getState();
        expect(sourceDeviceId).toBe("device-a");
      });

      it("should advance selection step to destination", () => {
        const { selectSourceDevice } = useMapModeStore.getState();
        selectSourceDevice("device-a");

        const { selectionStep } = useMapModeStore.getState();
        expect(selectionStep).toBe("destination");
      });

      it("should allow changing source device", () => {
        const { selectSourceDevice } = useMapModeStore.getState();

        selectSourceDevice("device-a");
        expect(useMapModeStore.getState().sourceDeviceId).toBe("device-a");

        selectSourceDevice("device-b");
        expect(useMapModeStore.getState().sourceDeviceId).toBe("device-b");
      });
    });

    describe("selectDestinationDevice", () => {
      it("should set destination device ID", () => {
        const { selectDestinationDevice } = useMapModeStore.getState();
        selectDestinationDevice("device-z");

        const { destinationDeviceId } = useMapModeStore.getState();
        expect(destinationDeviceId).toBe("device-z");
      });

      it("should set selection step to complete", () => {
        const { selectDestinationDevice } = useMapModeStore.getState();
        selectDestinationDevice("device-z");

        const { selectionStep } = useMapModeStore.getState();
        expect(selectionStep).toBe("complete");
      });
    });

    describe("clearDeviceSelection", () => {
      it("should clear both devices", () => {
        const { selectSourceDevice, selectDestinationDevice, clearDeviceSelection } =
          useMapModeStore.getState();

        selectSourceDevice("device-a");
        selectDestinationDevice("device-z");

        clearDeviceSelection();

        const { sourceDeviceId, destinationDeviceId } = useMapModeStore.getState();
        expect(sourceDeviceId).toBeNull();
        expect(destinationDeviceId).toBeNull();
      });

      it("should reset selection step to source", () => {
        const { selectSourceDevice, clearDeviceSelection } = useMapModeStore.getState();

        selectSourceDevice("device-a");
        clearDeviceSelection();

        const { selectionStep } = useMapModeStore.getState();
        expect(selectionStep).toBe("source");
      });
    });

    describe("clearSourceDevice", () => {
      it("should clear only source device", () => {
        const { selectSourceDevice, selectDestinationDevice, clearSourceDevice } =
          useMapModeStore.getState();

        selectSourceDevice("device-a");
        selectDestinationDevice("device-z");

        clearSourceDevice();

        const { sourceDeviceId, destinationDeviceId } = useMapModeStore.getState();
        expect(sourceDeviceId).toBeNull();
        expect(destinationDeviceId).toBe("device-z");
      });

      it("should reset selection step to source", () => {
        const { selectSourceDevice, clearSourceDevice } = useMapModeStore.getState();

        selectSourceDevice("device-a");
        clearSourceDevice();

        const { selectionStep } = useMapModeStore.getState();
        expect(selectionStep).toBe("source");
      });
    });

    describe("clearDestinationDevice", () => {
      it("should clear only destination device", () => {
        const { selectSourceDevice, selectDestinationDevice, clearDestinationDevice } =
          useMapModeStore.getState();

        selectSourceDevice("device-a");
        selectDestinationDevice("device-z");

        clearDestinationDevice();

        const { sourceDeviceId, destinationDeviceId } = useMapModeStore.getState();
        expect(sourceDeviceId).toBe("device-a");
        expect(destinationDeviceId).toBeNull();
      });

      it("should set selection step to destination if source exists", () => {
        const { selectSourceDevice, selectDestinationDevice, clearDestinationDevice } =
          useMapModeStore.getState();

        selectSourceDevice("device-a");
        selectDestinationDevice("device-z");

        clearDestinationDevice();

        const { selectionStep } = useMapModeStore.getState();
        expect(selectionStep).toBe("destination");
      });

      it("should set selection step to source if no source exists", () => {
        const { selectDestinationDevice, clearDestinationDevice } = useMapModeStore.getState();

        selectDestinationDevice("device-z");
        clearDestinationDevice();

        const { selectionStep } = useMapModeStore.getState();
        expect(selectionStep).toBe("source");
      });
    });
  });

  describe("Computed Properties", () => {
    describe("isExplorationMode", () => {
      it("should return true when in exploration mode", () => {
        const { isExplorationMode } = useMapModeStore.getState();
        expect(isExplorationMode()).toBe(true);
      });

      it("should return false when not in exploration mode", () => {
        const { enterPathPlanningMode, isExplorationMode } = useMapModeStore.getState();

        enterPathPlanningMode();
        expect(isExplorationMode()).toBe(false);
      });
    });

    describe("isPathPlanningMode", () => {
      it("should return true when in path-planning mode", () => {
        const { enterPathPlanningMode, isPathPlanningMode } = useMapModeStore.getState();

        enterPathPlanningMode();
        expect(isPathPlanningMode()).toBe(true);
      });

      it("should return false when not in path-planning mode", () => {
        const { isPathPlanningMode } = useMapModeStore.getState();
        expect(isPathPlanningMode()).toBe(false);
      });
    });

    describe("isPathActiveMode", () => {
      it("should return true when in path-active mode", () => {
        const { enterPathActiveMode, isPathActiveMode } = useMapModeStore.getState();

        enterPathActiveMode();
        expect(isPathActiveMode()).toBe(true);
      });

      it("should return false when not in path-active mode", () => {
        const { isPathActiveMode } = useMapModeStore.getState();
        expect(isPathActiveMode()).toBe(false);
      });
    });

    describe("hasSourceSelected", () => {
      it("should return true when source is selected", () => {
        const { selectSourceDevice, hasSourceSelected } = useMapModeStore.getState();

        selectSourceDevice("device-a");
        expect(hasSourceSelected()).toBe(true);
      });

      it("should return false when no source selected", () => {
        const { hasSourceSelected } = useMapModeStore.getState();
        expect(hasSourceSelected()).toBe(false);
      });
    });

    describe("hasDestinationSelected", () => {
      it("should return true when destination is selected", () => {
        const { selectDestinationDevice, hasDestinationSelected } = useMapModeStore.getState();

        selectDestinationDevice("device-z");
        expect(hasDestinationSelected()).toBe(true);
      });

      it("should return false when no destination selected", () => {
        const { hasDestinationSelected } = useMapModeStore.getState();
        expect(hasDestinationSelected()).toBe(false);
      });
    });

    describe("hasBothDevicesSelected", () => {
      it("should return true when both devices selected", () => {
        const { selectSourceDevice, selectDestinationDevice, hasBothDevicesSelected } =
          useMapModeStore.getState();

        selectSourceDevice("device-a");
        selectDestinationDevice("device-z");

        expect(hasBothDevicesSelected()).toBe(true);
      });

      it("should return false when only source selected", () => {
        const { selectSourceDevice, hasBothDevicesSelected } = useMapModeStore.getState();

        selectSourceDevice("device-a");
        expect(hasBothDevicesSelected()).toBe(false);
      });

      it("should return false when only destination selected", () => {
        const { selectDestinationDevice, hasBothDevicesSelected } = useMapModeStore.getState();

        selectDestinationDevice("device-z");
        expect(hasBothDevicesSelected()).toBe(false);
      });

      it("should return false when neither selected", () => {
        const { hasBothDevicesSelected } = useMapModeStore.getState();
        expect(hasBothDevicesSelected()).toBe(false);
      });
    });
  });

  describe("Reset", () => {
    it("should reset to initial state", () => {
      const {
        enterPathPlanningMode,
        selectSourceDevice,
        selectDestinationDevice,
        reset,
      } = useMapModeStore.getState();

      // Make changes
      enterPathPlanningMode();
      selectSourceDevice("device-a");
      selectDestinationDevice("device-z");

      // Reset
      reset();

      const state = useMapModeStore.getState();
      expect(state.mode).toBe("exploration");
      expect(state.previousMode).toBeNull();
      expect(state.sourceDeviceId).toBeNull();
      expect(state.destinationDeviceId).toBeNull();
      expect(state.selectionStep).toBe("source");
      expect(state.isTransitioning).toBe(false);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle full path planning workflow", () => {
      const {
        enterPathPlanningMode,
        selectSourceDevice,
        selectDestinationDevice,
        enterPathActiveMode,
        exitToExplorationMode,
      } = useMapModeStore.getState();

      // Start: exploration mode
      expect(useMapModeStore.getState().mode).toBe("exploration");

      // Step 1: Enter path planning
      enterPathPlanningMode();
      expect(useMapModeStore.getState().mode).toBe("path-planning");
      expect(useMapModeStore.getState().selectionStep).toBe("source");

      // Step 2: Select source
      selectSourceDevice("device-a");
      expect(useMapModeStore.getState().sourceDeviceId).toBe("device-a");
      expect(useMapModeStore.getState().selectionStep).toBe("destination");

      // Step 3: Select destination
      selectDestinationDevice("device-z");
      expect(useMapModeStore.getState().destinationDeviceId).toBe("device-z");
      expect(useMapModeStore.getState().selectionStep).toBe("complete");

      // Step 4: Enter path active mode
      enterPathActiveMode();
      expect(useMapModeStore.getState().mode).toBe("path-active");

      // Step 5: Exit back to exploration
      exitToExplorationMode();
      expect(useMapModeStore.getState().mode).toBe("exploration");
      expect(useMapModeStore.getState().sourceDeviceId).toBeNull();
      expect(useMapModeStore.getState().destinationDeviceId).toBeNull();
    });

    it("should allow aborting path planning", () => {
      const { enterPathPlanningMode, selectSourceDevice, exitToExplorationMode } =
        useMapModeStore.getState();

      // Enter path planning
      enterPathPlanningMode();
      selectSourceDevice("device-a");

      // Abort by exiting
      exitToExplorationMode();

      const state = useMapModeStore.getState();
      expect(state.mode).toBe("exploration");
      expect(state.sourceDeviceId).toBeNull();
    });
  });
});
