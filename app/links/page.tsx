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
  const { topologyData, isLoading, error } = useTopology();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading state during SSR and initial mount
  if (!mounted || isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <Card className="w-96">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
                <p className="text-muted-foreground">
                  Loading topology data...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <Card className="w-96">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold text-destructive">
                  Error Loading Data
                </h3>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button onClick={() => router.push("/upload")}>
                  Back to Upload
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show empty state if no data
  if (
    !topologyData ||
    !topologyData.topology ||
    topologyData.topology.length === 0
  ) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">
              Network Links
            </h1>
          </div>

          {/* Empty state */}
          <div className="flex items-center justify-center py-12">
            <Card className="w-96">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold">No Data Available</h3>
                  <p className="text-sm text-muted-foreground">
                    Please upload topology data files to view network links.
                  </p>
                  <Button onClick={() => router.push("/upload")}>
                    Go to Upload
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const links = topologyData.topology;

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        {/* Links Table */}
        <LinksTable data={links} />
      </div>
    </div>
  );
}
