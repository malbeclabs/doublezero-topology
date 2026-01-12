"use client";

/**
 * Links Page
 *
 * Displays a sortable, filterable data table of all network topology links.
 * Uses uploaded data from TopologyContext.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTopology } from "@/contexts/TopologyContext";
import { LinksTable } from "@/components/links/LinksTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LinksPage() {
  const router = useRouter();
  const { processedTopology, isLoading, error } = useTopology();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading state during SSR and initial mount
  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
              <p className="text-muted-foreground">Loading topology data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-destructive">
                Error Loading Data
              </h3>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => router.push("/")}>Load Data</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show empty state if no data
  if (
    !processedTopology ||
    !processedTopology.topology ||
    processedTopology.topology.length === 0
  ) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">No Data Available</h3>
              <p className="text-sm text-muted-foreground">
                Please load topology data files to view links.
              </p>
              <Button onClick={() => router.push("/")}>Load Data</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const links = processedTopology.topology;

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        {/* Links Table */}
        <LinksTable data={links} />
      </div>
    </div>
  );
}
