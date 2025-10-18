/**
 * Upload Flow Integration Tests
 *
 * Tests the end-to-end flow from file upload to topology processing.
 *
 * Current Implementation:
 * - POST to /api/upload with FormData (snapshot + isis files)
 * - API processes files in-memory and returns topology data
 * - No S3 or external storage involved
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import UploadPage from "@/app/upload/page";
import { TopologyProvider } from "@/contexts/TopologyContext";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock fetch for upload API
global.fetch = vi.fn();

describe("Upload Flow Integration", () => {
  const mockPush = vi.fn();
  const mockFetch = vi.mocked(fetch);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    } as any);
  });

  it("should successfully upload files and process topology data", async () => {
    const user = userEvent.setup();

    // Mock successful upload and processing (single API call)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          topology: [],
          locations: [],
          summary: {
            total_links: 88,
            healthy: 77,
            drift_high: 10,
            missing_telemetry: 0,
            missing_isis: 1,
          },
          processedAt: new Date().toISOString(),
        },
      }),
    } as Response);

    // Render upload page
    render(
      <TopologyProvider>
        <UploadPage />
      </TopologyProvider>
    );

    // Create mock files
    const snapshotFile = new File(['{"test": "data"}'], "snapshot.json", {
      type: "application/json",
    });
    const isisFile = new File(['{"test": "isis"}'], "isis-db.json", {
      type: "application/json",
    });

    // Upload files
    const snapshotInput = screen.getByLabelText(/Snapshot File/i);
    const isisInput = screen.getByLabelText(/IS-IS Database File/i);

    await user.upload(snapshotInput, snapshotFile);
    await user.upload(isisInput, isisFile);

    // Submit form
    const uploadButton = screen.getByRole("button", { name: /Upload & Process/i });
    await user.click(uploadButton);

    // Wait for upload to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Verify correct API call
    expect(mockFetch).toHaveBeenCalledWith("/api/upload", {
      method: "POST",
      body: expect.any(FormData),
    });

    // Verify success message
    await waitFor(() => {
      expect(
        screen.getByText(/Files processed successfully/i)
      ).toBeInTheDocument();
    });

    // Verify redirect to results page
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/results");
      },
      { timeout: 3000 }
    );
  });

  it("should handle upload and processing errors", async () => {
    const user = userEvent.setup();

    // Mock upload/processing error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: "Invalid JSON structure",
      }),
    } as Response);

    render(
      <TopologyProvider>
        <UploadPage />
      </TopologyProvider>
    );

    const snapshotFile = new File(['{"test": "data"}'], "snapshot.json", {
      type: "application/json",
    });
    const isisFile = new File(['{"test": "isis"}'], "isis-db.json", {
      type: "application/json",
    });

    const snapshotInput = screen.getByLabelText(/Snapshot File/i);
    const isisInput = screen.getByLabelText(/IS-IS Database File/i);

    await user.upload(snapshotInput, snapshotFile);
    await user.upload(isisInput, isisFile);

    const uploadButton = screen.getByRole("button", { name: /Upload & Process/i });
    await user.click(uploadButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Invalid JSON structure/i)
      ).toBeInTheDocument();
    });

    // Should not redirect
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("should require both files before submission", async () => {
    const user = userEvent.setup();

    render(
      <TopologyProvider>
        <UploadPage />
      </TopologyProvider>
    );

    // Try to submit without files
    const uploadButton = screen.getByRole("button", { name: /Upload & Process/i });

    // Button should be disabled
    expect(uploadButton).toBeDisabled();

    // Upload only snapshot file
    const snapshotFile = new File(['{"test": "data"}'], "snapshot.json", {
      type: "application/json",
    });
    const snapshotInput = screen.getByLabelText(/Snapshot File/i);
    await user.upload(snapshotInput, snapshotFile);

    // Button should still be disabled
    expect(uploadButton).toBeDisabled();

    // Upload ISIS file
    const isisFile = new File(['{"test": "isis"}'], "isis-db.json", {
      type: "application/json",
    });
    const isisInput = screen.getByLabelText(/IS-IS Database File/i);
    await user.upload(isisInput, isisFile);

    // Now button should be enabled
    expect(uploadButton).not.toBeDisabled();
  });

  it("should show processing progress", async () => {
    const user = userEvent.setup();

    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                success: true,
                data: {
                  topology: [],
                  locations: [],
                  summary: {
                    total_links: 88,
                    healthy: 77,
                    drift_high: 10,
                    missing_telemetry: 0,
                    missing_isis: 1,
                  },
                  processedAt: new Date().toISOString(),
                },
              }),
            } as Response);
          }, 300);
        })
    );

    render(
      <TopologyProvider>
        <UploadPage />
      </TopologyProvider>
    );

    const snapshotFile = new File(['{"test": "data"}'], "snapshot.json", {
      type: "application/json",
    });
    const isisFile = new File(['{"test": "isis"}'], "isis-db.json", {
      type: "application/json",
    });

    const snapshotInput = screen.getByLabelText(/Snapshot File/i);
    const isisInput = screen.getByLabelText(/IS-IS Database File/i);

    await user.upload(snapshotInput, snapshotFile);
    await user.upload(isisInput, isisFile);

    const uploadButton = screen.getByRole("button", { name: /Upload & Process/i });
    await user.click(uploadButton);

    // Check for processing progress
    await waitFor(() => {
      expect(screen.getByText(/Analyzing topology data/i)).toBeInTheDocument();
    });

    // Check button shows "Processing..."
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Processing/i })).toBeInTheDocument();
    });

    // Wait for success
    await waitFor(
      () => {
        expect(
          screen.getByText(/Files processed successfully/i)
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("should allow resetting the form", async () => {
    const user = userEvent.setup();

    render(
      <TopologyProvider>
        <UploadPage />
      </TopologyProvider>
    );

    const snapshotFile = new File(['{"test": "data"}'], "snapshot.json", {
      type: "application/json",
    });
    const isisFile = new File(['{"test": "isis"}'], "isis-db.json", {
      type: "application/json",
    });

    const snapshotInput = screen.getByLabelText(/Snapshot File/i);
    const isisInput = screen.getByLabelText(/IS-IS Database File/i);

    await user.upload(snapshotInput, snapshotFile);
    await user.upload(isisInput, isisFile);

    // Verify files are selected
    expect(screen.getByText(/Selected: snapshot.json/i)).toBeInTheDocument();
    expect(screen.getByText(/Selected: isis-db.json/i)).toBeInTheDocument();

    // Click reset button
    const resetButton = screen.getByRole("button", { name: /Reset/i });
    await user.click(resetButton);

    // Verify files are cleared
    expect(screen.queryByText(/Selected: snapshot.json/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Selected: isis-db.json/i)).not.toBeInTheDocument();

    // Upload button should be disabled again
    const uploadButton = screen.getByRole("button", { name: /Upload & Process/i });
    expect(uploadButton).toBeDisabled();
  });

  it("should handle network errors", async () => {
    const user = userEvent.setup();

    // Mock network error
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(
      <TopologyProvider>
        <UploadPage />
      </TopologyProvider>
    );

    const snapshotFile = new File(['{"test": "data"}'], "snapshot.json", {
      type: "application/json",
    });
    const isisFile = new File(['{"test": "isis"}'], "isis-db.json", {
      type: "application/json",
    });

    const snapshotInput = screen.getByLabelText(/Snapshot File/i);
    const isisInput = screen.getByLabelText(/IS-IS Database File/i);

    await user.upload(snapshotInput, snapshotFile);
    await user.upload(isisInput, isisFile);

    const uploadButton = screen.getByRole("button", { name: /Upload & Process/i });
    await user.click(uploadButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Network error/i)
      ).toBeInTheDocument();
    });

    // Should not redirect
    expect(mockPush).not.toHaveBeenCalled();
  });
});
