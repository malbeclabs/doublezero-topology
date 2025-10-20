import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, Map, Table } from "lucide-react";

export default function Home() {
  return (
    <div className="container mx-auto py-16">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl mb-4">
          Network Topology
        </h1>
        <p className="font-body text-lg text-muted-foreground max-w-2xl mx-auto">
          Network topology visualization and analysis system for comparing
          serviceability contracts, telemetry measurements, and IS-IS protocol
          state.
        </p>
      </div>

      {/* Quick Start Cards */}
      <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-3">
        <Link href="/upload" className="block group">
          <Card className="h-full border-2 border-border hover:border-blue-500/50 transition-all duration-200 hover:shadow-lg cursor-pointer">
            <CardHeader className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
                <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-3">
                <CardTitle className="text-2xl font-semibold">Upload Data</CardTitle>
                <CardDescription className="text-base leading-relaxed space-y-2.5">
                  <p>Start by uploading your network data files:</p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Serviceability & Telemetry</li>
                    <li>• IS-IS Database Detail</li>
                  </ul>
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/map" className="block group">
          <Card className="h-full border-2 border-border hover:border-green-500/50 transition-all duration-200 hover:shadow-lg cursor-pointer">
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
        </Link>

        <Link href="/links" className="block group">
          <Card className="h-full border-2 border-border hover:border-purple-500/50 transition-all duration-200 hover:shadow-lg cursor-pointer">
            <CardHeader className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-2">
                <Table className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="space-y-3">
                <CardTitle className="text-2xl font-semibold">Links Table</CardTitle>
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
        </Link>
      </div>
    </div>
  );
}
