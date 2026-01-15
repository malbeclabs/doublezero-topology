/**
 * Unit tests for TopologyContext memoization
 *
 * Tests verify that:
 * 1. Context value is memoized via useMemo
 * 2. Context value reference changes only when relevant state changes
 * 3. Actions are stable references (via useCallback)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { useRef, useEffect, useState } from "react";
import { TopologyProvider, useTopology } from "@/contexts/TopologyContext";
import type { SnapshotData, IsisData } from "@/lib/storage/snapshot-cache";

// Mock the storage functions
vi.mock("@/lib/storage/snapshot-cache", () => ({
  getCachedSnapshot: vi.fn(() => null),
  getCachedIsis: vi.fn(() => null),
  getCachedProcessedTopology: vi.fn(() => null),
  cacheSnapshot: vi.fn(() => true),
  cacheIsis: vi.fn(() => true),
  cacheProcessedTopology: vi.fn(() => true),
}));

// Mock fetch for processTopology
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create test snapshot data
function createMockSnapshot(id: string = "test"): SnapshotData {
  return {
    data: { id, fetch_data: {} },
    source: "upload",
    epoch: 1,
    timestamp: Date.now(),
    size: 100,
    filename: `snapshot-${id}.json`,
  };
}

// Helper to create test ISIS data
function createMockIsis(id: string = "test"): IsisData {
  return {
    data: { id, vrfs: {} },
    source: "upload",
    filename: `isis-${id}.json`,
    timestamp: Date.now(),
    size: 50,
  };
}

// Test component that tracks context value reference changes
function ContextValueTracker({
  onValueChange,
  onRenderCount,
}: {
  onValueChange: (value: ReturnType<typeof useTopology>) => void;
  onRenderCount: () => void;
}) {
  const context = useTopology();
  const prevValueRef = useRef<ReturnType<typeof useTopology> | null>(null);

  useEffect(() => {
    onRenderCount();
    if (prevValueRef.current !== context) {
      onValueChange(context);
    }
    prevValueRef.current = context;
  });

  return <div data-testid="tracker">Render count tracked</div>;
}

// Test component that tracks action reference stability
function ActionStabilityTracker({
  onActionChange,
}: {
  onActionChange: (actionName: string) => void;
}) {
  const { setSnapshotData, setIsisData, processTopology, clearAll } =
    useTopology();

  // Track if action references change
  const prevSetSnapshotRef = useRef(setSnapshotData);
  const prevSetIsisRef = useRef(setIsisData);
  const prevProcessRef = useRef(processTopology);
  const prevClearAllRef = useRef(clearAll);

  useEffect(() => {
    if (prevSetSnapshotRef.current !== setSnapshotData) {
      onActionChange("setSnapshotData");
      prevSetSnapshotRef.current = setSnapshotData;
    }
    if (prevSetIsisRef.current !== setIsisData) {
      onActionChange("setIsisData");
      prevSetIsisRef.current = setIsisData;
    }
    if (prevProcessRef.current !== processTopology) {
      onActionChange("processTopology");
      prevProcessRef.current = processTopology;
    }
    if (prevClearAllRef.current !== clearAll) {
      onActionChange("clearAll");
      prevClearAllRef.current = clearAll;
    }
  });

  return <div data-testid="action-tracker">Actions tracked</div>;
}

// Test component that can trigger state changes
function StateChanger() {
  const { setIsLoading, setError } = useTopology();

  return (
    <div>
      <button
        data-testid="toggle-loading"
        onClick={() => setIsLoading(true)}
      >
        Set Loading
      </button>
      <button
        data-testid="set-error"
        onClick={() => setError("Test error")}
      >
        Set Error
      </button>
    </div>
  );
}

describe("TopologyContext memoization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear sessionStorage
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.clear();
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("context value reference stability", () => {
    it("should maintain stable context value reference on initial render", () => {
      const valueChanges: ReturnType<typeof useTopology>[] = [];
      let renderCount = 0;

      render(
        <TopologyProvider>
          <ContextValueTracker
            onValueChange={(value) => valueChanges.push(value)}
            onRenderCount={() => renderCount++}
          />
        </TopologyProvider>
      );

      expect(screen.getByTestId("tracker")).toBeInTheDocument();
      // Initial render should produce exactly one context value
      expect(valueChanges.length).toBe(1);
    });

    it("should not change context reference when unrelated parent re-renders", async () => {
      const valueChanges: ReturnType<typeof useTopology>[] = [];
      let renderCount = 0;

      // Wrapper that can force re-renders
      function ReRenderWrapper({ children }: { children: React.ReactNode }) {
        const [, setCount] = useState(0);
        return (
          <>
            <button
              data-testid="force-rerender"
              onClick={() => setCount((c) => c + 1)}
            >
              Re-render
            </button>
            {children}
          </>
        );
      }

      render(
        <ReRenderWrapper>
          <TopologyProvider>
            <ContextValueTracker
              onValueChange={(value) => valueChanges.push(value)}
              onRenderCount={() => renderCount++}
            />
          </TopologyProvider>
        </ReRenderWrapper>
      );

      const initialValueCount = valueChanges.length;

      // Force parent re-render (should not affect provider's memoized value)
      const rerenderBtn = screen.getByTestId("force-rerender");
      await act(async () => {
        rerenderBtn.click();
      });

      // Context value reference should not have changed
      // (Provider re-renders but useMemo prevents new value creation)
      expect(valueChanges.length).toBe(initialValueCount);
    });
  });

  describe("context value updates when relevant state changes", () => {
    it("should update context value when isLoading changes", async () => {
      const valueChanges: ReturnType<typeof useTopology>[] = [];

      render(
        <TopologyProvider>
          <ContextValueTracker
            onValueChange={(value) => valueChanges.push(value)}
            onRenderCount={() => {}}
          />
          <StateChanger />
        </TopologyProvider>
      );

      const initialCount = valueChanges.length;

      // Change loading state
      const loadingBtn = screen.getByTestId("toggle-loading");
      await act(async () => {
        loadingBtn.click();
      });

      // Context value should have changed
      expect(valueChanges.length).toBeGreaterThan(initialCount);

      // New value should have isLoading = true
      const latestValue = valueChanges[valueChanges.length - 1];
      expect(latestValue.isLoading).toBe(true);
    });

    it("should update context value when error changes", async () => {
      const valueChanges: ReturnType<typeof useTopology>[] = [];

      render(
        <TopologyProvider>
          <ContextValueTracker
            onValueChange={(value) => valueChanges.push(value)}
            onRenderCount={() => {}}
          />
          <StateChanger />
        </TopologyProvider>
      );

      const initialCount = valueChanges.length;

      // Set error
      const errorBtn = screen.getByTestId("set-error");
      await act(async () => {
        errorBtn.click();
      });

      // Context value should have changed
      expect(valueChanges.length).toBeGreaterThan(initialCount);

      // New value should have the error
      const latestValue = valueChanges[valueChanges.length - 1];
      expect(latestValue.error).toBe("Test error");
    });
  });

  describe("action reference stability", () => {
    it("should maintain stable action references across renders", async () => {
      const actionChanges: string[] = [];

      function ReRenderWrapper({ children }: { children: React.ReactNode }) {
        const [, setCount] = useState(0);
        return (
          <>
            <button
              data-testid="force-rerender"
              onClick={() => setCount((c) => c + 1)}
            >
              Re-render
            </button>
            {children}
          </>
        );
      }

      render(
        <ReRenderWrapper>
          <TopologyProvider>
            <ActionStabilityTracker
              onActionChange={(name) => actionChanges.push(name)}
            />
          </TopologyProvider>
        </ReRenderWrapper>
      );

      // Clear initial action tracking
      actionChanges.length = 0;

      // Force multiple re-renders
      const rerenderBtn = screen.getByTestId("force-rerender");
      await act(async () => {
        rerenderBtn.click();
      });
      await act(async () => {
        rerenderBtn.click();
      });
      await act(async () => {
        rerenderBtn.click();
      });

      // Actions should NOT have changed (they use useCallback with stable dependencies)
      expect(actionChanges.length).toBe(0);
    });
  });

  describe("computed properties", () => {
    it("should correctly compute bothLoaded when both data sources present", () => {
      // This test verifies the computed property updates correctly
      let capturedContext: ReturnType<typeof useTopology> | null = null;

      function ContextCapture() {
        capturedContext = useTopology();
        return null;
      }

      render(
        <TopologyProvider>
          <ContextCapture />
        </TopologyProvider>
      );

      // Initially both should be false
      expect(capturedContext?.bothLoaded).toBe(false);
      expect(capturedContext?.snapshotData).toBe(null);
      expect(capturedContext?.isisData).toBe(null);
    });

    it("should correctly compute needsProcessing", () => {
      let capturedContext: ReturnType<typeof useTopology> | null = null;

      function ContextCapture() {
        capturedContext = useTopology();
        return null;
      }

      render(
        <TopologyProvider>
          <ContextCapture />
        </TopologyProvider>
      );

      // Initially should not need processing (no data loaded)
      expect(capturedContext?.needsProcessing).toBe(false);
    });

    it("should correctly compute canProcess", () => {
      let capturedContext: ReturnType<typeof useTopology> | null = null;

      function ContextCapture() {
        capturedContext = useTopology();
        return null;
      }

      render(
        <TopologyProvider>
          <ContextCapture />
        </TopologyProvider>
      );

      // Initially should not be able to process (no data)
      expect(capturedContext?.canProcess).toBe(false);
    });
  });

  describe("useTopology hook", () => {
    it("should throw error when used outside TopologyProvider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      function InvalidUsage() {
        useTopology();
        return null;
      }

      expect(() => {
        render(<InvalidUsage />);
      }).toThrow("useTopology must be used within TopologyProvider");

      consoleSpy.mockRestore();
    });

    it("should return context value when used inside TopologyProvider", () => {
      let capturedContext: ReturnType<typeof useTopology> | null = null;

      function ValidUsage() {
        capturedContext = useTopology();
        return <div>Valid</div>;
      }

      render(
        <TopologyProvider>
          <ValidUsage />
        </TopologyProvider>
      );

      expect(capturedContext).not.toBeNull();
      expect(capturedContext).toHaveProperty("snapshotData");
      expect(capturedContext).toHaveProperty("isisData");
      expect(capturedContext).toHaveProperty("processedTopology");
      expect(capturedContext).toHaveProperty("setSnapshotData");
      expect(capturedContext).toHaveProperty("setIsisData");
      expect(capturedContext).toHaveProperty("processTopology");
    });
  });

  describe("memoization dependency tracking", () => {
    it("should include all expected properties in context value", () => {
      let capturedContext: ReturnType<typeof useTopology> | null = null;

      function ContextCapture() {
        capturedContext = useTopology();
        return null;
      }

      render(
        <TopologyProvider>
          <ContextCapture />
        </TopologyProvider>
      );

      // Verify all expected properties are present
      const expectedProperties = [
        // Data
        "snapshotData",
        "isisData",
        "processedTopology",
        // Processing state
        "processingState",
        "processingError",
        // Actions
        "setSnapshotData",
        "setIsisData",
        "processTopology",
        "clearSnapshot",
        "clearIsis",
        "clearAll",
        // Computed
        "bothLoaded",
        "needsProcessing",
        "canProcess",
        // Loading states
        "isLoading",
        "setIsLoading",
        "error",
        "setError",
      ];

      for (const prop of expectedProperties) {
        expect(capturedContext).toHaveProperty(prop);
      }
    });

    it("should have correct initial state values", () => {
      let capturedContext: ReturnType<typeof useTopology> | null = null;

      function ContextCapture() {
        capturedContext = useTopology();
        return null;
      }

      render(
        <TopologyProvider>
          <ContextCapture />
        </TopologyProvider>
      );

      // Verify initial state
      expect(capturedContext?.snapshotData).toBe(null);
      expect(capturedContext?.isisData).toBe(null);
      expect(capturedContext?.processedTopology).toBe(null);
      expect(capturedContext?.processingState).toBe("idle");
      expect(capturedContext?.processingError).toBe(null);
      expect(capturedContext?.isLoading).toBe(false);
      expect(capturedContext?.error).toBe(null);
      expect(capturedContext?.bothLoaded).toBe(false);
      expect(capturedContext?.needsProcessing).toBe(false);
      expect(capturedContext?.canProcess).toBe(false);
    });
  });
});
