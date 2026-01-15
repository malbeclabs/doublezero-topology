"use client";

/**
 * Home Page / Load Page (v5 - Simplified, Root Page)
 *
 * Simple side-by-side cards with S3/Upload buttons.
 * Auto-processes in background when both files are ready.
 * Results button appears when processing is complete.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight } from "lucide-react";
import { DataSourceCard } from "@/components/load/DataSourceCard";
import { SnapshotFetchContent } from "@/components/load/SnapshotFetchContent";
import { ISISFetchContent } from "@/components/load/ISISFetchContent";
import { SnapshotManualContent } from "@/components/load/SnapshotManualContent";
import { ISISManualContent } from "@/components/load/ISISManualContent";
import { useTopology } from "@/contexts/TopologyContext";

export default function HomePage() {
  const router = useRouter();
  const { snapshotData, isisData, processedTopology, clearSnapshot, clearIsis, processTopology } = useTopology();

  // Modal states
  const [showSnapshotS3Modal, setShowSnapshotS3Modal] = useState(false);
  const [showSnapshotUploadModal, setShowSnapshotUploadModal] = useState(false);
  const [showIsisS3Modal, setShowIsisS3Modal] = useState(false);
  const [showIsisUploadModal, setShowIsisUploadModal] = useState(false);

  // Auto-processing state
  const [isProcessing, setIsProcessing] = useState(false);

  // Prefetch results page
  useEffect(() => {
    router.prefetch("/results");
  }, [router]);

  // Auto-process in background when both files are ready
  useEffect(() => {
    const autoProcess = async () => {
      if (snapshotData && isisData && !processedTopology && !isProcessing) {
        setIsProcessing(true);
        try {
          await processTopology();
        } catch (error) {
          console.error("Auto-processing failed:", error);
        } finally {
          setIsProcessing(false);
        }
      }
    };

    autoProcess();
  }, [snapshotData, isisData, processedTopology, isProcessing, processTopology]);

  const bothFilesReady = !!snapshotData && !!isisData;
  const resultsReady = !!processedTopology;

  return (
    <div className="container mx-auto py-8 px-6">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">
            Load Topology Data
          </h1>
          <p className="text-muted-foreground text-lg">
            Fetch from S3 or upload files manually to analyze network topology
          </p>
        </div>

        {/* Side-by-side Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Snapshot Card */}
          <DataSourceCard
            title="Snapshot Data"
            description={
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Network topology snapshot containing:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 dark:text-blue-400 mt-0.5">•</span>
                    <div>
                      <strong className="text-foreground">Serviceability</strong>
                      <span className="text-muted-foreground">: Expected link delays and bandwidth specifications</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 dark:text-blue-400 mt-0.5">•</span>
                    <div>
                      <strong className="text-foreground">Telemetry</strong>
                      <span className="text-muted-foreground">: Measured RTT samples from TWAMP probes</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 dark:text-blue-400 mt-0.5">•</span>
                    <div>
                      <strong className="text-foreground">Locations</strong>
                      <span className="text-muted-foreground">: Geographic coordinates for map visualization</span>
                    </div>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                  Format: JSON (~56 MB)
                </p>
              </div>
            }
            fileData={snapshotData}
            onS3Click={() => setShowSnapshotS3Modal(true)}
            onUploadClick={() => setShowSnapshotUploadModal(true)}
            onRemove={clearSnapshot}
          />

          {/* IS-IS Card */}
          <DataSourceCard
            title="IS-IS Database"
            description={
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Routing protocol state from network switches:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 dark:text-purple-400 mt-0.5">•</span>
                    <div>
                      <strong className="text-foreground">Adjacencies</strong>
                      <span className="text-muted-foreground">: Active routing neighbors and interface addresses</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 dark:text-purple-400 mt-0.5">•</span>
                    <div>
                      <strong className="text-foreground">Metrics</strong>
                      <span className="text-muted-foreground">: IS-IS link costs configured on switches</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 dark:text-purple-400 mt-0.5">•</span>
                    <div>
                      <strong className="text-foreground">LSPs</strong>
                      <span className="text-muted-foreground">: Link State PDUs with hostname and network topology</span>
                    </div>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                  Format: JSON (~877 KB)
                </p>
              </div>
            }
            fileData={isisData}
            onS3Click={() => setShowIsisS3Modal(true)}
            onUploadClick={() => setShowIsisUploadModal(true)}
            onRemove={clearIsis}
          />
        </div>

        {/* Status Messages */}
        {bothFilesReady && isProcessing && (
          <div className="text-center py-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800/50">
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              Processing topology data...
            </p>
          </div>
        )}

        {bothFilesReady && resultsReady && (
          <div className="text-center py-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800/50">
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
              ✓ Topology processed successfully
            </p>
          </div>
        )}

        {/* Results Button */}
        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            disabled={!resultsReady}
            onClick={() => router.push("/results")}
            className="w-full md:w-auto min-w-[200px]"
          >
            View Results
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Modals */}
        {/* Snapshot S3 Modal */}
        <Dialog open={showSnapshotS3Modal} onOpenChange={setShowSnapshotS3Modal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Fetch Snapshot from S3</DialogTitle>
              <DialogDescription>
                Download topology snapshot data from S3 storage
              </DialogDescription>
            </DialogHeader>
            <SnapshotFetchContent onSuccess={() => setShowSnapshotS3Modal(false)} />
          </DialogContent>
        </Dialog>

        {/* Snapshot Upload Modal */}
        <Dialog open={showSnapshotUploadModal} onOpenChange={setShowSnapshotUploadModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Snapshot File</DialogTitle>
              <DialogDescription>
                Select a snapshot JSON file from your computer
              </DialogDescription>
            </DialogHeader>
            <SnapshotManualContent onSuccess={() => setShowSnapshotUploadModal(false)} />
          </DialogContent>
        </Dialog>

        {/* ISIS S3 Modal */}
        <Dialog open={showIsisS3Modal} onOpenChange={setShowIsisS3Modal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Fetch IS-IS Database from S3</DialogTitle>
              <DialogDescription>
                Download IS-IS routing data from S3 storage
              </DialogDescription>
            </DialogHeader>
            <ISISFetchContent onSuccess={() => setShowIsisS3Modal(false)} />
          </DialogContent>
        </Dialog>

        {/* ISIS Upload Modal */}
        <Dialog open={showIsisUploadModal} onOpenChange={setShowIsisUploadModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload IS-IS Database File</DialogTitle>
              <DialogDescription>
                Select an IS-IS database JSON file from your computer
              </DialogDescription>
            </DialogHeader>
            <ISISManualContent onSuccess={() => setShowIsisUploadModal(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
