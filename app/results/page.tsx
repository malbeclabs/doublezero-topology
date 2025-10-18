"use client";

/**
 * Results Page
 *
 * Displays summary of processed topology data including:
 * - Health status distribution
 * - Total link count
 * - Processing metadata
 * - Quick actions to view map or table
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTopology } from "@/contexts/TopologyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function ResultsPage() {
  const router = useRouter();
  const { topologyData, isLoading, error } = useTopology();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prefetch map page for faster navigation
  useEffect(() => {
    if (topologyData) {
      router.prefetch('/map');
    }
  }, [topologyData, router]);

  // Redirect to upload if no data
  useEffect(() => {
    if (mounted && !isLoading && !topologyData && !error) {
      router.push("/upload");
    }
  }, [mounted, isLoading, topologyData, error, router]);

  // Show loading state during SSR and initial client mount
  if (!mounted || isLoading) {
    return (
      <div className="container mx-auto py-10 max-w-4xl">
        <Card>
          <CardContent className="py-10">
            <p className="text-center text-muted-foreground">
              Processing topology data...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 max-w-4xl">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push("/upload")}>
            Return to Upload
          </Button>
        </div>
      </div>
    );
  }

  if (!topologyData) {
    return null; // Will redirect via useEffect
  }

  const { summary, metadata } = topologyData;

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    // Use consistent formatting to avoid hydration mismatches
    return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  };

  const healthPercentage = (count: number): string => {
    if (summary.total_links === 0) return "0.0";
    return ((count / summary.total_links) * 100).toFixed(1);
  };

  return (
    <div className="container mx-auto py-10 max-w-6xl space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-heading text-4xl font-bold mb-3">Topology Analysis Results</h1>
        <p className="font-body text-muted-foreground text-lg">
          {summary.total_links} network links analyzed
        </p>
        <p className="font-body text-muted-foreground text-sm mt-1">
          Processed: {formatDate(metadata.processedAt)}
        </p>
      </div>

      {/* Big Cards Grid - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Healthy Links Card */}
        <Card
          className="border-2 border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20 hover:shadow-xl transition-all cursor-pointer group"
          onClick={() => router.push("/links?health_status=HEALTHY")}
        >
          <CardHeader className="pb-4">
            <CardDescription className="text-green-800 dark:text-green-300 text-base font-semibold">
              Healthy Links
            </CardDescription>
            <CardTitle className="text-6xl text-green-600 dark:text-green-400 font-bold">
              {summary.healthy}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-green-700 dark:text-green-300">
              {healthPercentage(summary.healthy)}% of total links
            </p>
            <p className="text-sm text-green-600 dark:text-green-400 group-hover:underline">
              Click to view all healthy links →
            </p>
          </CardContent>
        </Card>

        {/* Missing IS-IS Card */}
        <Card
          className="border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 hover:shadow-xl transition-all cursor-pointer group"
          onClick={() => router.push("/links?data_status=MISSING_ISIS")}
        >
          <CardHeader className="pb-4">
            <CardDescription className="text-red-800 dark:text-red-300 text-base font-semibold">
              Missing IS-IS Data
            </CardDescription>
            <CardTitle className="text-6xl text-red-600 dark:text-red-400 font-bold">
              {summary.missing_isis}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-red-700 dark:text-red-300">
              {healthPercentage(summary.missing_isis)}% of total links
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 group-hover:underline">
              Click to view affected links →
            </p>
          </CardContent>
        </Card>

        {/* High Drift Card */}
        <Card
          className="border-2 border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20 hover:shadow-xl transition-all cursor-pointer group"
          onClick={() => router.push("/links?health_status=DRIFT_HIGH")}
        >
          <CardHeader className="pb-4">
            <CardDescription className="text-orange-800 dark:text-orange-300 text-base font-semibold">
              High Drift Detected
            </CardDescription>
            <CardTitle className="text-6xl text-orange-600 dark:text-orange-400 font-bold">
              {summary.drift_high}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              {healthPercentage(summary.drift_high)}% of total links
            </p>
            <p className="text-sm text-orange-600 dark:text-orange-400 group-hover:underline">
              Click to view affected links →
            </p>
          </CardContent>
        </Card>

        {/* Missing Telemetry Card */}
        <Card
          className="border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 hover:shadow-xl transition-all cursor-pointer group"
          onClick={() => router.push("/links?health_status=MISSING_TELEMETRY")}
        >
          <CardHeader className="pb-4">
            <CardDescription className="text-gray-800 dark:text-gray-300 text-base font-semibold">
              Missing Telemetry
            </CardDescription>
            <CardTitle className="text-6xl text-gray-600 dark:text-gray-400 font-bold">
              {summary.missing_telemetry}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {healthPercentage(summary.missing_telemetry)}% of total links
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:underline">
              Click to view affected links →
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button onClick={() => router.push("/map")} size="lg" className="text-base">
            View Map
          </Button>
          <Button onClick={() => router.push("/links")} variant="outline" size="lg" className="text-base">
            View All Links
          </Button>
          <Button onClick={() => router.push("/upload")} variant="outline" size="lg" className="text-base">
            Upload New Files
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
