"use client";

/**
 * ISIS Fetch Content Component (v2 - Client-Side)
 *
 * Fetches ISIS database directly from S3 using client-side detection.
 * No server-side API required - uses direct HTTPS fetch.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Cloud, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useTopology } from "@/contexts/TopologyContext";
import { detectLatestIsis, detectLatestIsisForDate } from "@/lib/s3/isis-detector";
import { fetchFileFromUrl } from "@/lib/s3/public-bucket";
import type { IsisData } from "@/lib/storage/snapshot-cache";

type FetchState = "idle" | "fetching" | "success" | "error";

export interface ISISFetchContentProps {
  onSuccess?: () => void;
}

export function ISISFetchContent({ onSuccess }: ISISFetchContentProps = {}) {
  const { setIsisData, isisData } = useTopology();
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [specificDate, setSpecificDate] = useState<string>("");
  const [fetchedTimestamp, setFetchedTimestamp] = useState<string>("");

  const handleFetchLatest = async () => {
    setFetchState("fetching");
    setErrorMessage("");
    setFetchedTimestamp("");

    try {
      // Detect latest ISIS file
      const latest = await detectLatestIsis();

      if (!latest) {
        throw new Error("No ISIS files found in the last 30 days");
      }

      // Fetch the file
      const result = await fetchFileFromUrl(latest.url);

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch ISIS file");
      }

      // Store in context
      const isis: IsisData = {
        data: result.data,
        source: "s3",
        filename: latest.url.split("/").pop() || "isis-db.json",
        timestamp: latest.timestamp.getTime(),
        size: result.size || 0,
      };

      await setIsisData(isis);
      setFetchedTimestamp(latest.timestamp.toISOString());
      setFetchState("success");
      onSuccess?.();
    } catch (error) {
      setFetchState("error");
      const errorMsg =
        error instanceof Error ? error.message : "Failed to fetch ISIS file";
      setErrorMessage(errorMsg);
    }
  };

  const handleFetchByDate = async () => {
    if (!specificDate) {
      setErrorMessage("Please select a date");
      setFetchState("error");
      return;
    }

    setFetchState("fetching");
    setErrorMessage("");
    setFetchedTimestamp("");

    try {
      // Detect latest ISIS file for the specified date
      const latest = await detectLatestIsisForDate(specificDate);

      if (!latest) {
        throw new Error(`No ISIS files found for ${specificDate}`);
      }

      // Fetch the file
      const result = await fetchFileFromUrl(latest.url);

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch ISIS file");
      }

      // Store in context
      const isis: IsisData = {
        data: result.data,
        source: "s3",
        filename: latest.url.split("/").pop() || "isis-db.json",
        timestamp: latest.timestamp.getTime(),
        size: result.size || 0,
      };

      await setIsisData(isis);
      setFetchedTimestamp(latest.timestamp.toISOString());
      setFetchState("success");
      onSuccess?.();
    } catch (error) {
      setFetchState("error");
      const errorMsg =
        error instanceof Error ? error.message : "Failed to fetch ISIS file";
      setErrorMessage(errorMsg);
    }
  };

  const handleReset = () => {
    setFetchState("idle");
    setErrorMessage("");
    setSpecificDate("");
    setFetchedTimestamp("");
  };

  const isDisabled = fetchState === "fetching" || fetchState === "success";
  const hasIsis = !!isisData;

  return (
    <div className="space-y-6">
      {/* Already loaded indicator */}
      {hasIsis && fetchState === "idle" && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-400">
            IS-IS database already loaded. Fetching a new one will replace the current data.
          </AlertDescription>
        </Alert>
      )}

      {/* Fetch Latest Button */}
      <div className="space-y-2">
        <Button
          onClick={handleFetchLatest}
          disabled={isDisabled}
          className="w-full"
          size="lg"
        >
          {fetchState === "fetching" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fetching Latest...
            </>
          ) : (
            <>
              <Cloud className="mr-2 h-4 w-4" />
              Fetch Latest IS-IS
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Automatically downloads the latest IS-IS database (checks last 30 days)
        </p>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      {/* Fetch by Date */}
      <div className="space-y-2">
        <Label htmlFor="specific-date">Fetch by Date</Label>
        <div className="flex gap-2">
          <Input
            id="specific-date"
            type="date"
            value={specificDate}
            onChange={(e) => setSpecificDate(e.target.value)}
            disabled={isDisabled}
            className="flex-1"
          />
          <Button
            onClick={handleFetchByDate}
            disabled={isDisabled || !specificDate}
            variant="outline"
          >
            Fetch
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Gets the latest upload from the selected date (03:42, 09:42, 15:42, or 21:42 UTC)
        </p>
      </div>

      {/* Success Message */}
      {fetchState === "success" && fetchedTimestamp && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-400">
            IS-IS database fetched successfully!
            <span className="block text-xs mt-1 font-mono">
              Timestamp: {new Date(fetchedTimestamp).toLocaleString()} UTC
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {fetchState === "error" && errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Reset Button */}
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isDisabled}
          className="w-full"
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
