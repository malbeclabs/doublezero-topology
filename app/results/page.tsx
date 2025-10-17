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
    <div className="container mx-auto py-10 max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold">Topology Analysis</h1>
        <p className="font-body text-muted-foreground mt-2">
          Three-way comparison of serviceability contracts, telemetry measurements, and IS-IS protocol state
        </p>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Links */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Links</CardDescription>
            <CardTitle className="text-4xl">{summary.total_links}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Network connections analyzed
            </p>
          </CardContent>
        </Card>

        {/* Healthy Links */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardDescription className="text-green-800">Healthy Links</CardDescription>
            <CardTitle className="text-4xl text-green-600">
              {summary.healthy}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-green-700">
              {healthPercentage(summary.healthy)}% of total links
            </p>
            <Badge variant="default" className="mt-2 bg-green-500">
              HEALTHY
            </Badge>
          </CardContent>
        </Card>

        {/* Drift High Links */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardDescription className="text-red-800">High Drift</CardDescription>
            <CardTitle className="text-4xl text-red-600">
              {summary.drift_high}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-red-700">
              {healthPercentage(summary.drift_high)}% of total links
            </p>
            <Badge variant="destructive" className="mt-2">
              DRIFT_HIGH
            </Badge>
          </CardContent>
        </Card>

        {/* Missing Telemetry */}
        <Card className="border-border bg-muted/50">
          <CardHeader className="pb-3">
            <CardDescription className="text-foreground">Missing Telemetry</CardDescription>
            <CardTitle className="text-4xl text-muted-foreground">
              {summary.missing_telemetry}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {healthPercentage(summary.missing_telemetry)}% of total links
            </p>
            <Badge variant="secondary" className="mt-2">
              NO TELEMETRY
            </Badge>
          </CardContent>
        </Card>

        {/* Missing IS-IS */}
        <Card className="border-border bg-muted/50">
          <CardHeader className="pb-3">
            <CardDescription className="text-foreground">Missing IS-IS</CardDescription>
            <CardTitle className="text-4xl text-muted-foreground">
              {summary.missing_isis}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {healthPercentage(summary.missing_isis)}% of total links
            </p>
            <Badge variant="secondary" className="mt-2">
              NO IS-IS
            </Badge>
          </CardContent>
        </Card>

        {/* Processing Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Processed At</CardDescription>
            <CardTitle className="text-lg">
              {formatDate(metadata.processedAt)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Files: {metadata.snapshotKey.split('/').pop()?.substring(0, 20)}...
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Health Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Health Status Distribution</CardTitle>
          <CardDescription>
            Breakdown of network link health across all analyzed connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Health Bar Chart */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-green-600">Healthy</span>
                <span className="text-muted-foreground">
                  {summary.healthy} ({healthPercentage(summary.healthy)}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-green-500 dark:bg-green-600 h-3 rounded-full transition-all"
                  style={{ width: `${healthPercentage(summary.healthy)}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-red-600 dark:text-red-400">Drift High</span>
                <span className="text-muted-foreground">
                  {summary.drift_high} ({healthPercentage(summary.drift_high)}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-red-500 dark:bg-red-600 h-3 rounded-full transition-all"
                  style={{ width: `${healthPercentage(summary.drift_high)}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">Missing Telemetry</span>
                <span className="text-muted-foreground">
                  {summary.missing_telemetry} ({healthPercentage(summary.missing_telemetry)}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-muted-foreground/50 h-3 rounded-full transition-all"
                  style={{ width: `${healthPercentage(summary.missing_telemetry)}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">Missing IS-IS</span>
                <span className="text-muted-foreground">
                  {summary.missing_isis} ({healthPercentage(summary.missing_isis)}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-muted-foreground/50 h-3 rounded-full transition-all"
                  style={{ width: `${healthPercentage(summary.missing_isis)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis & Visualization</CardTitle>
          <CardDescription>
            Explore the topology data through interactive visualizations
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button onClick={() => router.push("/map")} size="lg">
            View Geographic Map
          </Button>
          <Button onClick={() => router.push("/links")} variant="outline" size="lg">
            View Links Table
          </Button>
          <Button onClick={() => router.push("/upload")} variant="outline" size="lg">
            Upload New Files
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
