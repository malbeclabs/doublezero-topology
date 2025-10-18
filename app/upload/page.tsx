"use client";

/**
 * File Upload Page
 *
 * Allows users to upload topology data files for analysis.
 * Files are processed directly in memory - no external storage required.
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTopology } from "@/contexts/TopologyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

type UploadState = "idle" | "uploading" | "success" | "error";

export default function UploadPage() {
  const router = useRouter();
  const { setTopologyData, setIsLoading, setError } = useTopology();
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [snapshotFile, setSnapshotFile] = useState<File | null>(null);
  const [isisFile, setIsisFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const snapshotInputRef = useRef<HTMLInputElement>(null);
  const isisInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const handleSnapshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSnapshotFile(file);
      setErrorMessage("");
    }
  };

  const handleIsisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsisFile(file);
      setErrorMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!snapshotFile || !isisFile) {
      setErrorMessage("Please select both files before uploading");
      return;
    }

    setUploadState("uploading");
    setUploadProgress(0);
    setErrorMessage("");
    setIsLoading(true);
    setError(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append("snapshot", snapshotFile);
      formData.append("isis", isisFile);

      // Upload and process files in one step
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload and processing failed");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Processing failed");
      }

      // Store processed data in context (transform to match expected structure)
      setTopologyData({
        topology: result.data.topology,
        locations: result.data.locations,
        summary: result.data.summary,
        metadata: {
          snapshotKey: snapshotFile.name,
          isisKey: isisFile.name,
          processedAt: result.data.processedAt,
        },
      });
      setIsLoading(false);
      setUploadState("success");

      // Redirect to results page
      setTimeout(() => {
        router.push("/results");
      }, 2000);
    } catch (error) {
      clearInterval(progressInterval);
      setIsLoading(false);
      setUploadState("error");
      const errorMsg =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setErrorMessage(errorMsg);
      setError(errorMsg);
    }
  };

  const handleReset = () => {
    setSnapshotFile(null);
    setIsisFile(null);
    setUploadState("idle");
    setErrorMessage("");
    setUploadProgress(0);
    if (snapshotInputRef.current) snapshotInputRef.current.value = "";
    if (isisInputRef.current) isisInputRef.current.value = "";
  };

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Upload Network Data</CardTitle>
          <CardDescription className="font-body">
            Upload your network topology JSON files to visualize and analyze the
            network state
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Snapshot File Input */}
            <div className="space-y-2">
              <Label htmlFor="snapshot">
                Snapshot File (max 100MB)
              </Label>
              <Input
                id="snapshot"
                ref={snapshotInputRef}
                type="file"
                accept=".json"
                onChange={handleSnapshotChange}
                disabled={uploadState === "uploading"}
                className="cursor-pointer"
              />
              {snapshotFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {snapshotFile.name} ({formatFileSize(snapshotFile.size)})
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Contains serviceability and telemetry data (mn-epoch-*-snapshot.json)
              </p>
            </div>

            {/* ISIS File Input */}
            <div className="space-y-2">
              <Label htmlFor="isis">
                IS-IS Database File (max 10MB)
              </Label>
              <Input
                id="isis"
                ref={isisInputRef}
                type="file"
                accept=".json"
                onChange={handleIsisChange}
                disabled={uploadState === "uploading"}
                className="cursor-pointer"
              />
              {isisFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {isisFile.name} ({formatFileSize(isisFile.size)})
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Contains IS-IS routing protocol data (isis-db.json)
              </p>
            </div>

            {/* Upload Progress Bar */}
            {uploadState === "uploading" && (
              <div className="space-y-2">
                <Label>Processing Files</Label>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  {uploadProgress}% - Analyzing topology data...
                </p>
              </div>
            )}

            {/* Success Message */}
            {uploadState === "success" && (
              <Alert className="border-green-500 bg-green-50">
                <AlertDescription className="text-green-800">
                  Files processed successfully! Redirecting to results...
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {uploadState === "error" && errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={
                  !snapshotFile ||
                  !isisFile ||
                  uploadState === "uploading" ||
                  uploadState === "success"
                }
                className="flex-1"
              >
                {uploadState === "uploading" && "Processing..."}
                {uploadState !== "uploading" && "Upload & Process"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={uploadState === "uploading" || uploadState === "success"}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* File Requirements Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">File Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>Snapshot File:</strong>
            <ul className="list-disc list-inside ml-2 text-muted-foreground">
              <li>Must be valid JSON format</li>
              <li>Maximum size: 100MB</li>
              <li>Contains serviceability links and telemetry samples</li>
              <li>Expected structure: fetch_data.dz_serviceability.links</li>
            </ul>
          </div>
          <div>
            <strong>IS-IS Database File:</strong>
            <ul className="list-disc list-inside ml-2 text-muted-foreground">
              <li>Must be valid JSON format</li>
              <li>Maximum size: 10MB</li>
              <li>Contains routing adjacencies and metrics</li>
              <li>Expected structure: vrfs.default.isisInstances</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
