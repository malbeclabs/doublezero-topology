"use client";

/**
 * Missing ISIS Alert Banner Component
 *
 * Compact alert banner when links with missing ISIS data are detected.
 * Provides quick action to filter and view affected links.
 */

import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface MissingIsisAlertProps {
  missingIsisCount: number;
  totalLinks: number;
  onViewMissingLinks: () => void;
}

export function MissingIsisAlert({
  missingIsisCount,
  totalLinks,
  onViewMissingLinks,
}: MissingIsisAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  // Don't show alert if no missing ISIS data or if dismissed
  if (missingIsisCount === 0 || dismissed) {
    return null;
  }

  const percentage = ((missingIsisCount / totalLinks) * 100).toFixed(1);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg shadow-sm">
      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
      <div className="flex-1 flex items-center gap-3 text-sm">
        <span className="font-semibold text-red-900 dark:text-red-200">
          Missing IS-IS:
        </span>
        <span className="text-red-800 dark:text-red-300">
          {missingIsisCount} link{missingIsisCount > 1 ? "s" : ""} ({percentage}%)
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onViewMissingLinks}
        className="h-7 px-3 text-xs border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 shrink-0"
      >
        View Links
      </Button>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
        title="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
