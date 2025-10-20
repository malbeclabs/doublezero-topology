/**
 * Route Planning Modal Component
 *
 * Clean modal interface for route planning that opens when user clicks "Plan Route".
 * Contains form with source, destination, and strategy selectors.
 *
 * Features:
 * - Searchable device dropdowns (Command + Popover)
 * - Strategy selector
 * - Compute Path / Cancel actions
 * - Auto-closes on successful path computation
 */

"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Route, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Location } from "@/types/topology";
import type { WeightingStrategy } from "@/lib/graph/types";

export interface RouteModalProps {
  /** Whether modal is open */
  open: boolean;

  /** Callback when modal open state changes */
  onOpenChange: (open: boolean) => void;

  /** Available locations with devices */
  locations: Location[];

  /** Callback when path computation is requested */
  onComputePath: (
    sourceId: string,
    destinationId: string,
    strategy: WeightingStrategy,
  ) => void;

  /** Whether path is currently being computed */
  isComputing?: boolean;
}

/**
 * RouteModal Component
 *
 * Modal dialog for planning a route between two devices.
 */
export function RouteModal({
  open,
  onOpenChange,
  locations,
  onComputePath,
  isComputing = false,
}: RouteModalProps) {
  // State for selected devices
  const [sourceDeviceId, setSourceDeviceId] = useState<string>("");
  const [destinationDeviceId, setDestinationDeviceId] = useState<string>("");
  const [strategy, setStrategy] =
    useState<WeightingStrategy>("latency");

  // State for popover open states
  const [sourceOpen, setSourceOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);

  // State for search queries
  const [sourceSearch, setSourceSearch] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");

  // Build list of all devices from locations
  const devices = useMemo(() => {
    const deviceList: Array<{ id: string; label: string }> = [];

    for (const location of locations) {
      for (const deviceId of location.devices) {
        deviceList.push({
          id: deviceId,
          label: deviceId, // Device PK is the device code
        });
      }
    }

    // Sort alphabetically
    return deviceList.sort((a, b) => a.label.localeCompare(b.label));
  }, [locations]);

  // Filtered device lists based on search
  const filteredSourceDevices = useMemo(() => {
    if (!sourceSearch) return devices;
    return devices.filter((d) =>
      d.label.toLowerCase().includes(sourceSearch.toLowerCase())
    );
  }, [devices, sourceSearch]);

  const filteredDestinationDevices = useMemo(() => {
    const filtered = devices.filter((d) => d.id !== sourceDeviceId);
    if (!destinationSearch) return filtered;
    return filtered.filter((d) =>
      d.label.toLowerCase().includes(destinationSearch.toLowerCase())
    );
  }, [devices, sourceDeviceId, destinationSearch]);

  // Get device label by ID
  const getDeviceLabel = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    return device?.label || deviceId;
  };

  // Handle compute path
  const handleComputePath = () => {
    if (!sourceDeviceId || !destinationDeviceId) return;
    onComputePath(sourceDeviceId, destinationDeviceId, strategy);
  };

  // Reset form when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      // Reset form state when closing
      setSourceDeviceId("");
      setDestinationDeviceId("");
      setStrategy("latency");
      setSourceSearch("");
      setDestinationSearch("");
    }
  };

  // Check if form is valid
  const isFormValid =
    sourceDeviceId &&
    destinationDeviceId &&
    sourceDeviceId !== destinationDeviceId;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-blue-500" />
            Plan Route
          </DialogTitle>
          <DialogDescription>
            Select source and destination devices to compute the optimal path.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source Device Selector */}
          <div className="space-y-2 relative">
            <label className="text-sm font-medium">Source Device</label>
            <Button
              variant="outline"
              onClick={() => setSourceOpen(!sourceOpen)}
              className="w-full justify-between"
            >
              {sourceDeviceId
                ? getDeviceLabel(sourceDeviceId)
                : "Select source device..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
            {sourceOpen && (
              <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-80">
                <div className="flex items-center border-b px-3 py-2">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    placeholder="Search devices..."
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    className="h-8 border-0 p-0 focus-visible:ring-0"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto p-1">
                  {filteredSourceDevices.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No device found.
                    </div>
                  ) : (
                    filteredSourceDevices.map((device) => (
                      <button
                        key={device.id}
                        onClick={() => {
                          setSourceDeviceId(device.id);
                          setSourceOpen(false);
                          setSourceSearch("");
                        }}
                        className={cn(
                          "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          "focus:bg-accent focus:text-accent-foreground"
                        )}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            sourceDeviceId === device.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {device.label}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Destination Device Selector */}
          <div className="space-y-2 relative">
            <label className="text-sm font-medium">Destination Device</label>
            <Button
              variant="outline"
              onClick={() => setDestinationOpen(!destinationOpen)}
              className="w-full justify-between"
            >
              {destinationDeviceId
                ? getDeviceLabel(destinationDeviceId)
                : "Select destination device..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
            {destinationOpen && (
              <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-80">
                <div className="flex items-center border-b px-3 py-2">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    placeholder="Search devices..."
                    value={destinationSearch}
                    onChange={(e) => setDestinationSearch(e.target.value)}
                    className="h-8 border-0 p-0 focus-visible:ring-0"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto p-1">
                  {filteredDestinationDevices.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No device found.
                    </div>
                  ) : (
                    filteredDestinationDevices.map((device) => (
                      <button
                        key={device.id}
                        onClick={() => {
                          setDestinationDeviceId(device.id);
                          setDestinationOpen(false);
                          setDestinationSearch("");
                        }}
                        className={cn(
                          "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          "focus:bg-accent focus:text-accent-foreground"
                        )}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            destinationDeviceId === device.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {device.label}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Strategy Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Routing Strategy</label>
            <Select
              value={strategy}
              onValueChange={(value) =>
                setStrategy(value as WeightingStrategy)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latency">
                  <div>
                    <div className="font-medium">Latency (P95 RTT)</div>
                    <div className="text-xs text-muted-foreground">
                      Minimize measured latency
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="hops">
                  <div>
                    <div className="font-medium">Hop Count</div>
                    <div className="text-xs text-muted-foreground">
                      Minimize number of hops
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="bandwidth">
                  <div>
                    <div className="font-medium">Bandwidth</div>
                    <div className="text-xs text-muted-foreground">
                      Maximize available bandwidth
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isComputing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleComputePath}
            disabled={!isFormValid || isComputing}
          >
            {isComputing ? "Computing..." : "Compute Path"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
