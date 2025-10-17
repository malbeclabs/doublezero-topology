/**
 * Upload Flow Integration Tests
 *
 * Tests the end-to-end flow from file upload to topology processing.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import UploadPage from "@/app/upload/page";
import { uploadFiles } from "@/app/actions/upload";
import { TopologyProvider } from "@/contexts/TopologyContext";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock upload server action
vi.mock("@/app/actions/upload", () => ({
  uploadFiles: vi.fn(),
}));

// Mock fetch for topology API
global.fetch = vi.fn();

describe("Upload Flow Integration", () => {
  const mockPush = vi.fn();
  const mockUploadFiles = vi.mocked(uploadFiles);
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

    // Mock successful upload
    mockUploadFiles.mockResolvedValueOnce({
      success: true,
      data: {
        snapshotKey: "snapshots/123-snapshot.json",
        isisKey: "isis/123-isis.json",
      },
    });

    // Mock successful topology processing
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          topology: [],
          summary: {
            total_links: 100,
            healthy: 80,
            drift_high: 10,
            missing_telemetry: 5,
            missing_isis: 5,
          },
          metadata: {
            snapshotKey: "snapshots/123-snapshot.json",
            isisKey: "isis/123-isis.json",
            processedAt: new Date().toISOString(),
          },
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
    const uploadButton = screen.getByRole("button", { name: /Upload Files/i });
    await user.click(uploadButton);

    // Wait for upload to complete
    await waitFor(() => {
      expect(mockUploadFiles).toHaveBeenCalledTimes(1);
    });

    // Wait for topology processing
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/topology", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snapshotKey: "snapshots/123-snapshot.json",
          isisKey: "isis/123-isis.json",
        }),
      });
    });

    // Verify success message
    await waitFor(() => {
      expect(
        screen.getByText(/Topology data processed successfully/i)
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

  it("should handle upload errors", async () => {
    const user = userEvent.setup();

    // Mock upload error
    mockUploadFiles.mockResolvedValueOnce({
      success: false,
      error: "Upload failed: File too large",
    });

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

    const uploadButton = screen.getByRole("button", { name: /Upload Files/i });
    await user.click(uploadButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Upload failed: File too large/i)
      ).toBeInTheDocument();
    });

    // Should not redirect
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("should handle topology processing errors", async () => {
    const user = userEvent.setup();

    // Mock successful upload
    mockUploadFiles.mockResolvedValueOnce({
      success: true,
      data: {
        snapshotKey: "snapshots/123-snapshot.json",
        isisKey: "isis/123-isis.json",
      },
    });

    // Mock topology processing error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: "Processing failed",
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

    const uploadButton = screen.getByRole("button", { name: /Upload Files/i });
    await user.click(uploadButton);

    await waitFor(() => {
      expect(mockUploadFiles).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Processing failed: Processing failed/i)
      ).toBeInTheDocument();
    });

    // Should not redirect
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("should show upload and processing progress", async () => {
    const user = userEvent.setup();

    mockUploadFiles.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: true,
              data: {
                snapshotKey: "snapshots/123-snapshot.json",
                isisKey: "isis/123-isis.json",
              },
            });
          }, 100);
        })
    );

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
                  summary: {
                    total_links: 100,
                    healthy: 80,
                    drift_high: 10,
                    missing_telemetry: 5,
                    missing_isis: 5,
                  },
                  metadata: {
                    snapshotKey: "snapshots/123-snapshot.json",
                    isisKey: "isis/123-isis.json",
                    processedAt: new Date().toISOString(),
                  },
                },
              }),
            } as Response);
          }, 100);
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

    const uploadButton = screen.getByRole("button", { name: /Upload Files/i });
    await user.click(uploadButton);

    // Check for upload progress
    await waitFor(() => {
      expect(screen.getByText(/Uploading files to storage/i)).toBeInTheDocument();
    });

    // Check for processing progress
    await waitFor(
      () => {
        expect(
          screen.getByText(/Analyzing topology data/i)
        ).toBeInTheDocument();
      },
      { timeout: 500 }
    );

    // Wait for success
    await waitFor(
      () => {
        expect(
          screen.getByText(/Topology data processed successfully/i)
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
