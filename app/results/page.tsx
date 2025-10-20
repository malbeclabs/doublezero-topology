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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Map,
  Table,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

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
      router.prefetch("/map");
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

  const { summary } = topologyData;

  const healthPercentage = (count: number): string => {
    if (summary.total_links === 0) return "0.0";
    return ((count / summary.total_links) * 100).toFixed(1);
  };

  return (
    <div className="container mx-auto py-10 max-w-6xl space-y-8">
      {/* Navigation Cards - Large */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          className="h-full border-2 border-border hover:border-green-500/50 transition-all duration-200 hover:shadow-lg cursor-pointer"
          onClick={() => router.push("/map")}
        >
          <CardHeader className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-2">
              <Map className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-3">
              <CardTitle className="text-2xl font-semibold">Map View</CardTitle>
              <CardDescription className="text-base leading-relaxed space-y-2.5">
                <p>Interactive geographic visualization:</p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Color-coded links by health status</li>
                  <li>• Hover to see detailed metrics</li>
                </ul>
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="h-full border-2 border-border hover:border-purple-500/50 transition-all duration-200 hover:shadow-lg cursor-pointer"
          onClick={() => router.push("/links")}
        >
          <CardHeader className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-2">
              <Table className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="space-y-3">
              <CardTitle className="text-2xl font-semibold">
                Links Table
              </CardTitle>
              <CardDescription className="text-base leading-relaxed space-y-2.5">
                <p>Comprehensive data table with:</p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Sortable & filterable network links</li>
                  <li>• Expected vs Measured RTT metrics</li>
                </ul>
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Metric Cards - Compact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Healthy Links */}
        <Card
          className="border-2 border-border hover:border-green-500/50 transition-all duration-200 hover:shadow-lg cursor-pointer"
          onClick={() => router.push("/links?health_status=HEALTHY")}
        >
          <CardHeader className="p-4 space-y-2">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-3xl font-bold text-green-600 dark:text-green-400">
              {summary.healthy}
            </CardTitle>
            <CardDescription className="text-sm font-medium">
              Healthy Links
            </CardDescription>
            <p className="text-xs text-muted-foreground">
              {healthPercentage(summary.healthy)}% of total
            </p>
          </CardHeader>
        </Card>

        {/* Missing IS-IS */}
        <Card
          className="border-2 border-border hover:border-red-500/50 transition-all duration-200 hover:shadow-lg cursor-pointer"
          onClick={() => router.push("/links?data_status=MISSING_ISIS")}
        >
          <CardHeader className="p-4 space-y-2">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-3xl font-bold text-red-600 dark:text-red-400">
              {summary.missing_isis}
            </CardTitle>
            <CardDescription className="text-sm font-medium">
              Missing IS-IS Data
            </CardDescription>
            <p className="text-xs text-muted-foreground">
              {healthPercentage(summary.missing_isis)}% of total
            </p>
          </CardHeader>
        </Card>

        {/* High Drift */}
        <Card
          className="border-2 border-border hover:border-orange-500/50 transition-all duration-200 hover:shadow-lg cursor-pointer"
          onClick={() => router.push("/links?health_status=DRIFT_HIGH")}
        >
          <CardHeader className="p-4 space-y-2">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {summary.drift_high}
            </CardTitle>
            <CardDescription className="text-sm font-medium">
              High Drift Detected
            </CardDescription>
            <p className="text-xs text-muted-foreground">
              {healthPercentage(summary.drift_high)}% of total
            </p>
          </CardHeader>
        </Card>

        {/* Missing Telemetry */}
        <Card
          className="border-2 border-border hover:border-gray-500/50 transition-all duration-200 hover:shadow-lg cursor-pointer"
          onClick={() => router.push("/links?health_status=MISSING_TELEMETRY")}
        >
          <CardHeader className="p-4 space-y-2">
            <div className="w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-600 dark:text-gray-400">
              {summary.missing_telemetry}
            </CardTitle>
            <CardDescription className="text-sm font-medium">
              Missing Telemetry
            </CardDescription>
            <p className="text-xs text-muted-foreground">
              {healthPercentage(summary.missing_telemetry)}% of total
            </p>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
