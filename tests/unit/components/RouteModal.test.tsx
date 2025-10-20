/**
 * RouteModal Component Tests
 *
 * Tests for the route planning modal component.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouteModal } from "@/components/map/RouteModal";
import type { Location } from "@/types/topology";

describe("RouteModal", () => {
  const mockLocations: Location[] = [
    {
      pk: "loc1",
      code: "LOC1",
      name: "Location 1",
      lat: 40.7128,
      lon: -74.006,
      devices: ["device-a", "device-b"],
    },
    {
      pk: "loc2",
      code: "LOC2",
      name: "Location 2",
      lat: 51.5074,
      lon: -0.1278,
      devices: ["device-c", "device-d"],
    },
  ];

  const mockOnOpenChange = vi.fn();
  const mockOnComputePath = vi.fn();

  it("renders when open", () => {
    render(
      <RouteModal
        open={true}
        onOpenChange={mockOnOpenChange}
        locations={mockLocations}
        onComputePath={mockOnComputePath}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Plan Route")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Select source and destination devices to compute the optimal path.",
      ),
    ).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <RouteModal
        open={false}
        onOpenChange={mockOnOpenChange}
        locations={mockLocations}
        onComputePath={mockOnComputePath}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders all form fields", () => {
    render(
      <RouteModal
        open={true}
        onOpenChange={mockOnOpenChange}
        locations={mockLocations}
        onComputePath={mockOnComputePath}
      />,
    );

    expect(screen.getByText("Source Device")).toBeInTheDocument();
    expect(screen.getByText("Destination Device")).toBeInTheDocument();
    expect(screen.getByText("Routing Strategy")).toBeInTheDocument();
  });

  it("has Compute Path button disabled by default", () => {
    render(
      <RouteModal
        open={true}
        onOpenChange={mockOnOpenChange}
        locations={mockLocations}
        onComputePath={mockOnComputePath}
      />,
    );

    const computeButton = screen.getByRole("button", { name: /compute path/i });
    expect(computeButton).toBeDisabled();
  });

  it("enables Compute Path button when source and destination are selected", async () => {
    const user = userEvent.setup();

    render(
      <RouteModal
        open={true}
        onOpenChange={mockOnOpenChange}
        locations={mockLocations}
        onComputePath={mockOnComputePath}
      />,
    );

    // Click source device selector (first button with "Select source device..." text)
    const sourceButton = screen.getByText("Select source device...");
    await user.click(sourceButton);

    // Wait for popover and select device-a
    await waitFor(() => {
      expect(screen.getByText("device-a")).toBeInTheDocument();
    });
    await user.click(screen.getByText("device-a"));

    // Click destination device selector
    const destButton = screen.getByText("Select destination device...");
    await user.click(destButton);

    // Wait for popover and select device-c
    await waitFor(() => {
      expect(screen.getByText("device-c")).toBeInTheDocument();
    });
    await user.click(screen.getByText("device-c"));

    // Compute Path button should be enabled
    const computeButton = screen.getByRole("button", { name: /compute path/i });
    expect(computeButton).toBeEnabled();
  });

  it("calls onComputePath with correct arguments", async () => {
    const user = userEvent.setup();

    render(
      <RouteModal
        open={true}
        onOpenChange={mockOnOpenChange}
        locations={mockLocations}
        onComputePath={mockOnComputePath}
      />,
    );

    // Select source device
    const sourceButton = screen.getByText("Select source device...");
    await user.click(sourceButton);
    await waitFor(() => {
      expect(screen.getByText("device-a")).toBeInTheDocument();
    });
    await user.click(screen.getByText("device-a"));

    // Select destination device
    const destButton = screen.getByText("Select destination device...");
    await user.click(destButton);
    await waitFor(() => {
      expect(screen.getByText("device-c")).toBeInTheDocument();
    });
    await user.click(screen.getByText("device-c"));

    // Click Compute Path
    const computeButton = screen.getByRole("button", { name: /compute path/i });
    await user.click(computeButton);

    // Should call onComputePath with correct args
    expect(mockOnComputePath).toHaveBeenCalledWith(
      "device-a",
      "device-c",
      "latency", // Default strategy
    );
  });

  it("filters out source device from destination options", async () => {
    const user = userEvent.setup();

    render(
      <RouteModal
        open={true}
        onOpenChange={mockOnOpenChange}
        locations={mockLocations}
        onComputePath={mockOnComputePath}
      />,
    );

    // Select source device
    const sourceButton = screen.getByText("Select source device...");
    await user.click(sourceButton);
    await waitFor(() => {
      expect(screen.getByText("device-a")).toBeInTheDocument();
    });
    await user.click(screen.getByText("device-a"));

    // Open destination dropdown
    const destButton = screen.getByText("Select destination device...");
    await user.click(destButton);

    // device-a should not be in destination options
    await waitFor(() => {
      const devices = screen.queryAllByText("device-a");
      // Should only find it in the source button, not in destination list
      expect(devices.length).toBe(1);
    });
  });

  it("calls onOpenChange when Cancel is clicked", async () => {
    const user = userEvent.setup();

    render(
      <RouteModal
        open={true}
        onOpenChange={mockOnOpenChange}
        locations={mockLocations}
        onComputePath={mockOnComputePath}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables buttons when isComputing is true", () => {
    render(
      <RouteModal
        open={true}
        onOpenChange={mockOnOpenChange}
        locations={mockLocations}
        onComputePath={mockOnComputePath}
        isComputing={true}
      />,
    );

    const computeButton = screen.getByRole("button", { name: /computing/i });
    const cancelButton = screen.getByRole("button", { name: /cancel/i });

    expect(computeButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it("shows 'Computing...' text when isComputing is true", () => {
    render(
      <RouteModal
        open={true}
        onOpenChange={mockOnOpenChange}
        locations={mockLocations}
        onComputePath={mockOnComputePath}
        isComputing={true}
      />,
    );

    expect(screen.getByText("Computing...")).toBeInTheDocument();
  });

  it("sorts devices alphabetically", async () => {
    const user = userEvent.setup();

    render(
      <RouteModal
        open={true}
        onOpenChange={mockOnOpenChange}
        locations={mockLocations}
        onComputePath={mockOnComputePath}
      />,
    );

    // Open source dropdown
    const sourceButton = screen.getByText("Select source device...");
    await user.click(sourceButton);

    // Check that devices are in alphabetical order
    await waitFor(() => {
      // Get all buttons in the popover that represent device options
      const deviceElements = screen.getAllByRole("button").filter(btn =>
        btn.textContent && btn.textContent.startsWith("device-")
      );
      const deviceNames = deviceElements.map((el) => el.textContent?.trim() || "");

      // Should be sorted: device-a, device-b, device-c, device-d
      expect(deviceNames).toEqual([
        "device-a",
        "device-b",
        "device-c",
        "device-d",
      ]);
    });
  });
});
