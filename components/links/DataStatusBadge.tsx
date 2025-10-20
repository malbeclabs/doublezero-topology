/**
 * Data Status Badge Component
 *
 * Displays a badge showing the data completeness status of a network link.
 */

import { Badge } from "@/components/ui/badge";
import type { DataCompleteness } from "@/types/topology";
import { getDataStatusLabel } from "@/types/topology";

interface DataStatusBadgeProps {
  status: DataCompleteness;
}

/**
 * Get custom className for data status badge
 *
 * @param status - Data completeness status
 * @returns Tailwind CSS classes with improved contrast and shadows
 */
function getStatusClassName(status: DataCompleteness): string {
  switch (status) {
    case "COMPLETE":
      // Vibrant green with strong contrast
      return "bg-green-500/15 text-green-700 dark:bg-green-500/20 dark:text-green-400 border border-green-500/30 dark:border-green-500/40 shadow-sm";
    case "MISSING_ISIS":
      // Bold red with high visibility (highest priority alert)
      return "bg-red-500/20 text-red-700 dark:bg-red-500/25 dark:text-red-400 border border-red-500/40 dark:border-red-500/50 shadow-md font-bold";
    case "MISSING_TELEMETRY":
      // Bright amber/orange for warning
      return "bg-amber-400/20 text-amber-800 dark:bg-amber-400/25 dark:text-amber-300 border border-amber-500/40 dark:border-amber-500/50 shadow-sm";
    case "MISSING_BOTH":
      // Prominent gray for critical missing data
      return "bg-slate-400/20 text-slate-700 dark:bg-slate-400/25 dark:text-slate-300 border border-slate-500/40 dark:border-slate-500/50 shadow-sm";
    default:
      return "";
  }
}

export function DataStatusBadge({ status }: DataStatusBadgeProps) {
  const label = getDataStatusLabel(status);
  const className = getStatusClassName(status);

  return (
    <Badge className={`${className} font-semibold text-xs uppercase tracking-wide`}>
      {label}
    </Badge>
  );
}
