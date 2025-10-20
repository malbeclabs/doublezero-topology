/**
 * Tests for PathComputedPanel component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PathComputedPanel } from "@/components/map/PathComputedPanel";
import type { NetworkPath, WeightingStrategy } from "@/lib/graph/types";

const mockPath: NetworkPath = {
  source: { id: "device-a", name: "device-a" },
  destination: { id: "device-z", name: "device-z" },
  hops: [
    { id: "device-a", name: "device-a" },
    { id: "device-b", name: "device-b" },
    { id: "device-c", name: "device-c" },
    { id: "device-z", name: "device-z" },
  ],
  links: [
    {
      id: "link1",
      source: "device-a",
      target: "device-b",
      latencyUs: 5000,
      bandwidthGbps: 10,
    },
    {
      id: "link2",
      source: "device-b",
      target: "device-c",
      latencyUs: 10000,
      bandwidthGbps: 50,
    },
    {
      id: "link3",
      source: "device-c",
      target: "device-z",
      latencyUs: 15000,
      bandwidthGbps: 100,
    },
  ],
  totalHops: 3,
  totalLatencyUs: 30000,
};

describe("PathComputedPanel", () => {
  it("renders with path data", () => {
    const mockOnClose = vi.fn();
    render(
      <PathComputedPanel
        path={mockPath}
        strategy="latency"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Path Computed")).toBeInTheDocument();
    // Device names appear multiple times (in route and hop details)
    expect(screen.getAllByText("device-a").length).toBeGreaterThan(0);
    expect(screen.getAllByText("device-z").length).toBeGreaterThan(0);
  });

  it("displays correct source and destination", () => {
    const mockOnClose = vi.fn();
    render(
      <PathComputedPanel
        path={mockPath}
        strategy="latency"
        onClose={mockOnClose}
      />
    );

    // Check for device names in compact inline format
    expect(screen.getAllByText("device-a").length).toBeGreaterThan(0);
    expect(screen.getAllByText("device-z").length).toBeGreaterThan(0);
    // Arrow separator should be present
    expect(screen.getAllByText("→").length).toBeGreaterThan(0);
  });

  it("displays correct metrics", () => {
    const mockOnClose = vi.fn();
    render(
      <PathComputedPanel
        path={mockPath}
        strategy="latency"
        onClose={mockOnClose}
      />
    );

    // Hops count
    expect(screen.getByText("Hops")).toBeInTheDocument();
    // "3" appears multiple times (metrics and "Hop X of 3")
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);

    // Total delay (30000 μs = 30 ms)
    expect(screen.getByText("Delay")).toBeInTheDocument();
    expect(screen.getByText("30.00 ms")).toBeInTheDocument();
  });

  it("displays strategy selector", () => {
    const mockOnClose = vi.fn();
    const mockOnStrategyChange = vi.fn();
    render(
      <PathComputedPanel
        path={mockPath}
        strategy="latency"
        onClose={mockOnClose}
        onStrategyChange={mockOnStrategyChange}
      />
    );

    expect(screen.getByText("Routing Strategy")).toBeInTheDocument();
    expect(screen.getByText("Latency (P95 RTT)")).toBeInTheDocument();
  });

  it("has hop details expanded by default", () => {
    const mockOnClose = vi.fn();
    render(
      <PathComputedPanel
        path={mockPath}
        strategy="latency"
        onClose={mockOnClose}
      />
    );

    // Header should be visible
    expect(screen.getByText("Hop Details")).toBeInTheDocument();
    expect(screen.getByText("(3 hops)")).toBeInTheDocument();

    // Hop details should be visible by default
    expect(screen.getByText("Hop 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("link1")).toBeInTheDocument();
  });

  it("collapses hop details when clicked", async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();
    render(
      <PathComputedPanel
        path={mockPath}
        strategy="latency"
        onClose={mockOnClose}
      />
    );

    // Hop details start expanded, click to collapse
    const hopDetailsHeader = screen.getByText("Hop Details");
    await user.click(hopDetailsHeader);

    // Hop details should now be hidden
    await waitFor(() => {
      expect(screen.queryByText("Hop 1 of 3")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("link1")).not.toBeInTheDocument();
  });

  it("re-expands hop details when clicked again", async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();
    render(
      <PathComputedPanel
        path={mockPath}
        strategy="latency"
        onClose={mockOnClose}
      />
    );

    // Collapse first (since it starts expanded)
    const hopDetailsHeader = screen.getByText("Hop Details");
    await user.click(hopDetailsHeader);
    await waitFor(() => {
      expect(screen.queryByText("Hop 1 of 3")).not.toBeInTheDocument();
    });

    // Re-expand
    await user.click(hopDetailsHeader);
    await waitFor(() => {
      expect(screen.getByText("Hop 1 of 3")).toBeInTheDocument();
    });
  });

  it("displays all hops since expanded by default", () => {
    const mockOnClose = vi.fn();
    render(
      <PathComputedPanel
        path={mockPath}
        strategy="latency"
        onClose={mockOnClose}
      />
    );

    // All 3 hops should be visible by default
    expect(screen.getByText("Hop 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("Hop 2 of 3")).toBeInTheDocument();
    expect(screen.getByText("Hop 3 of 3")).toBeInTheDocument();
  });

  it("displays hop metrics correctly", () => {
    const mockOnClose = vi.fn();
    render(
      <PathComputedPanel
        path={mockPath}
        strategy="latency"
        onClose={mockOnClose}
      />
    );

    // Hop details are expanded by default, check metrics
    // First hop: 5000 μs = 5 ms, 10 Gbps
    expect(screen.getByText("5.00 ms")).toBeInTheDocument();
    expect(screen.getByText("10 Gbps")).toBeInTheDocument();

    // Second hop: 10000 μs = 10 ms, 50 Gbps
    expect(screen.getByText("10.00 ms")).toBeInTheDocument();
    expect(screen.getByText("50 Gbps")).toBeInTheDocument();

    // Third hop: 15000 μs = 15 ms, 100 Gbps
    expect(screen.getByText("15.00 ms")).toBeInTheDocument();
    expect(screen.getByText("100 Gbps")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();
    render(
      <PathComputedPanel
        path={mockPath}
        strategy="latency"
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getAllByRole("button")[0]; // First button is close button
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("renders strategy selector with callback when onStrategyChange is provided", () => {
    const mockOnClose = vi.fn();
    const mockOnStrategyChange = vi.fn();
    render(
      <PathComputedPanel
        path={mockPath}
        strategy="latency"
        onClose={mockOnClose}
        onStrategyChange={mockOnStrategyChange}
      />
    );

    // Should render combobox (Select component)
    const strategySelector = screen.getByRole("combobox");
    expect(strategySelector).toBeInTheDocument();
    expect(strategySelector).not.toBeDisabled();
  });

  it("disables strategy selector when recomputing", () => {
    const mockOnClose = vi.fn();
    const mockOnStrategyChange = vi.fn();
    render(
      <PathComputedPanel
        path={mockPath}
        strategy="latency"
        onClose={mockOnClose}
        onStrategyChange={mockOnStrategyChange}
        isRecomputing={true}
      />
    );

    const strategyTrigger = screen.getByRole("combobox");
    expect(strategyTrigger).toBeDisabled();
  });

  it("shows loading indicator when recomputing", () => {
    const mockOnClose = vi.fn();
    const mockOnStrategyChange = vi.fn();
    render(
      <PathComputedPanel
        path={mockPath}
        strategy="latency"
        onClose={mockOnClose}
        onStrategyChange={mockOnStrategyChange}
        isRecomputing={true}
      />
    );

    // SVG refresh icon should be present with animate-spin class
    const refreshIcon = document.querySelector(".animate-spin");
    expect(refreshIcon).toBeInTheDocument();
  });
});
