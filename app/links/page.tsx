/**
 * Links Page
 *
 * Displays a sortable, filterable data table of all network topology links.
 */

import { Suspense } from "react";
import { LinksTable } from "@/components/links/LinksTable";
import type { TopologyLink } from "@/types/topology";

/**
 * Fetch topology data from API
 */
async function getTopologyData(): Promise<TopologyLink[]> {
  try {
    const response = await fetch(`http://localhost:3000/api/topology`, {
      cache: 'no-store', // Always fetch fresh data
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid API response');
    }

    return result.data.topology;
  } catch (error) {
    console.error('Failed to fetch topology data:', error);
    return [];
  }
}

export default async function LinksPage() {
  const links = await getTopologyData();

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Network Links</h1>
          <p className="font-body text-muted-foreground mt-2">
            Sortable, filterable view of all topology links with health status.
          </p>
          <p className="font-body text-sm text-muted-foreground/70 mt-1">
            Loaded {links.length} links from local data files
          </p>
        </div>

        {/* Links Table */}
        {links.length > 0 ? (
          <Suspense fallback={
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading table...</p>
            </div>
          }>
            <LinksTable data={links} />
          </Suspense>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No topology data available. Check that data files exist in /data directory.
          </div>
        )}
      </div>
    </div>
  );
}
