"use client";

/**
 * DataSourceCard Component (v5 - Simplified)
 *
 * Simple card with:
 * - Title and description with bullet points
 * - Status indicator on right (only when loaded)
 * - Two buttons: S3 and Upload (both always visible)
 * - File info when loaded
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Cloud, Upload, X } from "lucide-react";
import type { SnapshotData, IsisData } from "@/lib/storage/snapshot-cache";

export interface DataSourceCardProps {
  title: string;
  description: React.ReactNode; // Changed to ReactNode to support bullet points
  fileData: SnapshotData | IsisData | null;
  onS3Click: () => void;
  onUploadClick: () => void;
  onRemove: () => void;
}

export function DataSourceCard({
  title,
  description,
  fileData,
  onS3Click,
  onUploadClick,
  onRemove,
}: DataSourceCardProps) {
  const isLoaded = !!fileData;

  // Format file size
  const formatSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Format timestamp to relative time
  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return "just now";
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;

    const days = Math.floor(hours / 24);
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  return (
    <Card className={isLoaded ? "border-green-500" : undefined}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="font-bold mb-2">{title}</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {description}
            </CardDescription>
          </div>

          {/* Status indicator - only show when loaded */}
          {isLoaded && (
            <div className="flex-shrink-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">
                  Loaded
                </span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* File Info (when loaded) */}
        {isLoaded && fileData && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium font-mono truncate">
                  {fileData.filename}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{formatSize(fileData.size)}</span>
                  <span>•</span>
                  <span className="capitalize">{fileData.source}</span>
                  {fileData.source === "s3" && "epoch" in fileData && fileData.epoch && (
                    <>
                      <span>•</span>
                      <span>Epoch {fileData.epoch}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{formatTimestamp(fileData.timestamp)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-8 w-8 p-0 ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={onS3Click}
            className="w-full"
          >
            <Cloud className="h-4 w-4 mr-2" />
            {isLoaded ? "Re-fetch from S3" : "S3 Fetch"}
          </Button>

          <Button
            variant="outline"
            onClick={onUploadClick}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isLoaded ? "Re-upload" : "Upload"}
          </Button>
        </div>

        {/* Empty State Help Text */}
        {!isLoaded && (
          <p className="text-xs text-center text-muted-foreground">
            Choose S3 fetch or manual upload to begin
          </p>
        )}
      </CardContent>
    </Card>
  );
}
