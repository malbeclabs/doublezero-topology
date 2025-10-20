"use client";

import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TopologyLink } from "@/types/topology";
import { HealthStatusBadge } from "./HealthStatusBadge";
import { DataStatusBadge } from "./DataStatusBadge";
import { useTableStore } from "@/lib/stores/table-store";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getBandwidthTier } from "@/lib/parsers/bandwidth";

interface LinksTableProps {
  data: TopologyLink[];
}

function formatDelay(us: number | null): string {
  if (us === null) return "-";
  return `${(us / 1000).toFixed(2)} ms`;
}

function formatDriftPct(pct: number | null): string {
  if (pct === null) return "-";
  return `${pct.toFixed(1)}%`;
}

export function LinksTable({ data }: LinksTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const { selectedLinkPk, setSelectedLink, setHoveredLink } = useTableStore();

  // Auto-detect unique bandwidth values from data
  const uniqueBandwidths = React.useMemo(() => {
    const tiersSet = new Set<number>();
    data.forEach(link => {
      const tier = getBandwidthTier(link.bandwidth_gbps);
      tiersSet.add(tier);
    });
    return Array.from(tiersSet).sort((a, b) => a - b);
  }, [data]);

  // Prefetch map page for faster navigation
  React.useEffect(() => {
    router.prefetch('/map');
  }, [router]);

  // Apply filters from URL params on mount
  React.useEffect(() => {
    const healthStatus = searchParams.get('health_status');
    const dataStatus = searchParams.get('data_status');

    const filters: ColumnFiltersState = [];

    if (healthStatus) {
      filters.push({ id: 'health_status', value: healthStatus });
    }

    if (dataStatus) {
      filters.push({ id: 'data_status', value: dataStatus });
    }

    if (filters.length > 0) {
      setColumnFilters(filters);
    }
  }, [searchParams]);

  const handleViewOnMap = (linkPk: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    setSelectedLink(linkPk);
    router.push(`/map?link_pk=${encodeURIComponent(linkPk)}`);
  };

  const columns: ColumnDef<TopologyLink>[] = [
    {
      id: "view_on_map",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => handleViewOnMap(row.original.link_pk, e)}
          className="h-8 w-8 p-0 hover:bg-blue-500/10 hover:text-blue-500"
          title="View on map"
        >
          <MapPin className="h-4 w-4" />
        </Button>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "device_a_code",
      header: "Source Device",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue("device_a_code")}</span>
      ),
    },
    {
      accessorKey: "device_z_code",
      header: "Target Device",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue("device_z_code")}</span>
      ),
    },
    {
      accessorKey: "health_status",
      header: "Health Status",
      cell: ({ row }) => (
        <HealthStatusBadge status={row.getValue("health_status")} />
      ),
      filterFn: (row, id, value) => {
        return value === "ALL" || row.getValue(id) === value;
      },
    },
    {
      accessorKey: "data_status",
      header: "Data Status",
      cell: ({ row }) => (
        <DataStatusBadge status={row.getValue("data_status")} />
      ),
      filterFn: (row, id, value) => {
        return value === "ALL" || row.getValue(id) === value;
      },
    },
    {
      accessorKey: "bandwidth_gbps",
      header: "Bandwidth",
      cell: ({ row }) => {
        const bandwidth = row.original.bandwidth_label;
        const gbps = row.getValue("bandwidth_gbps") as number | null;

        if (!bandwidth || gbps === null) {
          return <span className="text-muted-foreground">N/A</span>;
        }

        // Color code by bandwidth tier
        let colorClass = "text-foreground";
        if (gbps >= 200) {
          colorClass = "text-sky-600 dark:text-sky-400"; // Deep blue
        } else if (gbps >= 100) {
          colorClass = "text-teal-600 dark:text-teal-400"; // Dark teal
        } else if (gbps >= 50) {
          colorClass = "text-teal-500 dark:text-teal-500"; // Medium teal
        } else {
          colorClass = "text-green-500 dark:text-green-400"; // Light green
        }

        return (
          <span className={`font-semibold ${colorClass}`}>
            {bandwidth}
          </span>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.bandwidth_gbps ?? -1;
        const b = rowB.original.bandwidth_gbps ?? -1;
        return a - b;
      },
      filterFn: (row, id, value) => {
        if (value === "ALL") return true;
        const tier = getBandwidthTier(row.getValue(id) as number | null);
        return tier === parseInt(value);
      },
    },
    {
      accessorKey: "expected_delay_us",
      header: "Expected Delay",
      cell: ({ row }) => formatDelay(row.getValue("expected_delay_us")),
    },
    {
      accessorKey: "measured_p90_us",
      header: "Measured P90",
      cell: ({ row }) => formatDelay(row.getValue("measured_p90_us")),
    },
    {
      accessorKey: "measured_p95_us",
      header: "Measured P95",
      cell: ({ row }) => formatDelay(row.getValue("measured_p95_us")),
    },
    {
      accessorKey: "measured_p99_us",
      header: "Measured P99",
      cell: ({ row }) => formatDelay(row.getValue("measured_p99_us")),
    },
    {
      accessorKey: "drift_pct",
      header: "Drift %",
      cell: ({ row }) => {
        const drift = row.getValue("drift_pct") as number | null;
        const formatted = formatDriftPct(drift);
        if (drift === null) return <span className="text-muted-foreground">{formatted}</span>;
        if (drift >= 10) return <span className="text-red-400 dark:text-red-400 font-semibold">{formatted}</span>;
        return <span>{formatted}</span>;
      },
    },
    {
      accessorKey: "isis_metric",
      header: "IS-IS Metric",
      cell: ({ row }) => formatDelay(row.getValue("isis_metric")),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  const handleRowClick = (linkPk: string) => {
    setSelectedLink(linkPk === selectedLinkPk ? null : linkPk);
  };

  const handleRowHover = (linkPk: string | null) => {
    setHoveredLink(linkPk);
  };

  const healthStatusFilter = table.getColumn("health_status")?.getFilterValue() as string | undefined;
  const dataStatusFilter = table.getColumn("data_status")?.getFilterValue() as string | undefined;
  const bandwidthFilter = table.getColumn("bandwidth_gbps")?.getFilterValue() as string | undefined;

  const clearAllFilters = () => {
    setColumnFilters([]);
    router.push('/links');
  };

  const hasActiveFilters = healthStatusFilter || dataStatusFilter || bandwidthFilter;

  return (
    <div className="space-y-4">
      {/* Active Filters Badge */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
            Active filters:
          </span>
          {healthStatusFilter && (
            <Badge variant="secondary" className="gap-1">
              Health: {healthStatusFilter.replace('_', ' ')}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => table.getColumn("health_status")?.setFilterValue(undefined)}
              />
            </Badge>
          )}
          {dataStatusFilter && (
            <Badge variant="secondary" className="gap-1">
              Data: {dataStatusFilter.replace('_', ' ')}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => table.getColumn("data_status")?.setFilterValue(undefined)}
              />
            </Badge>
          )}
          {bandwidthFilter && (
            <Badge variant="secondary" className="gap-1">
              Bandwidth: {bandwidthFilter} Gbps
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => table.getColumn("bandwidth_gbps")?.setFilterValue(undefined)}
              />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 px-2 text-xs ml-auto"
          >
            Clear all
          </Button>
        </div>
      )}

      <div className="flex items-center gap-4 flex-wrap">
        <Input
          placeholder="Search links, devices..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />

        <Select
          value={healthStatusFilter ?? "ALL"}
          onValueChange={(value) =>
            table.getColumn("health_status")?.setFilterValue(value === "ALL" ? undefined : value)
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by health" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Health Status</SelectItem>
            <SelectItem value="HEALTHY">Healthy</SelectItem>
            <SelectItem value="DRIFT_HIGH">Drift High</SelectItem>
            <SelectItem value="MISSING_TELEMETRY">Missing Telemetry</SelectItem>
            <SelectItem value="MISSING_ISIS">Missing IS-IS</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={dataStatusFilter ?? "ALL"}
          onValueChange={(value) =>
            table.getColumn("data_status")?.setFilterValue(value === "ALL" ? undefined : value)
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by data" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Data Status</SelectItem>
            <SelectItem value="COMPLETE">Complete</SelectItem>
            <SelectItem value="MISSING_ISIS">Missing IS-IS</SelectItem>
            <SelectItem value="MISSING_TELEMETRY">Missing Telemetry</SelectItem>
            <SelectItem value="MISSING_BOTH">Missing Both</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={bandwidthFilter ?? "ALL"}
          onValueChange={(value) =>
            table.getColumn("bandwidth_gbps")?.setFilterValue(value === "ALL" ? undefined : value)
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by bandwidth" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Bandwidth</SelectItem>
            {uniqueBandwidths.map(bw => (
              <SelectItem key={bw} value={String(bw)}>
                {bw} Gbps
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} of {data.length} links
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? "cursor-pointer select-none flex items-center gap-1"
                            : ""
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: " ↑",
                          desc: " ↓",
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const linkPk = row.original.link_pk;
                const isSelected = linkPk === selectedLinkPk;

                return (
                  <TableRow
                    key={row.id}
                    data-state={isSelected ? "selected" : undefined}
                    onClick={() => handleRowClick(linkPk)}
                    onMouseEnter={() => handleRowHover(linkPk)}
                    onMouseLeave={() => handleRowHover(null)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-muted/50"
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
