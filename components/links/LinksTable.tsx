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
import { TopologyLink, HealthStatus } from "@/types/topology";
import { HealthStatusBadge } from "./HealthStatusBadge";
import { useTableStore } from "@/lib/stores/table-store";

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

  const { selectedLinkPk, setSelectedLink, setHoveredLink } = useTableStore();

  const columns: ColumnDef<TopologyLink>[] = [
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
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
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="HEALTHY">Healthy</SelectItem>
            <SelectItem value="DRIFT_HIGH">Drift High</SelectItem>
            <SelectItem value="MISSING_TELEMETRY">Missing Telemetry</SelectItem>
            <SelectItem value="MISSING_ISIS">Missing IS-IS</SelectItem>
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
