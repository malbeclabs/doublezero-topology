"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import type { TopologyLink, Location } from "@/types/topology";
import { useTableStore } from "@/lib/stores/table-store";

interface MapSearchProps {
  links: TopologyLink[];
  locations: Location[];
}

export function MapSearch({ links, locations }: MapSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { selectedLinkPk, setSelectedLink } = useTableStore();

  const selectedLink = selectedLinkPk
    ? links.find(link => link.link_pk === selectedLinkPk)
    : null;

  const searchResults = useMemo(() => {
    if (!search) return { links: [], locations: [] };

    const searchLower = search.toLowerCase();

    const matchedLinks = links.filter(link =>
      link.link_code.toLowerCase().includes(searchLower) ||
      link.device_a_code.toLowerCase().includes(searchLower) ||
      link.device_z_code.toLowerCase().includes(searchLower) ||
      link.device_a_location_name.toLowerCase().includes(searchLower) ||
      link.device_z_location_name.toLowerCase().includes(searchLower)
    ).slice(0, 10);

    const matchedLocations = locations.filter(loc =>
      loc.name.toLowerCase().includes(searchLower) ||
      loc.code.toLowerCase().includes(searchLower)
    ).slice(0, 10);

    return { links: matchedLinks, locations: matchedLocations };
  }, [search, links, locations]);

  const handleSelectLink = (linkPk: string) => {
    setSelectedLink(linkPk);
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    setSearch("");
    setSelectedLink(null);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search links or locations..."
            className="w-full pl-10 pr-10 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(e.target.value.length > 0);
            }}
            onFocus={() => setOpen(search.length > 0)}
          />
          {(search || selectedLinkPk) && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title={selectedLinkPk ? "Clear selection" : "Clear search"}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

      {open && (search.length > 0) && (
        <div className="absolute top-full mt-2 w-full rounded-lg border border-border bg-background shadow-lg z-50 max-h-[400px] overflow-auto">
          {searchResults.links.length === 0 && searchResults.locations.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No results found.
            </div>
          ) : (
            <div className="py-2">
              {searchResults.links.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                    Links
                  </div>
                  {searchResults.links.map((link) => (
                    <div
                      key={link.link_pk}
                      onClick={() => handleSelectLink(link.link_pk)}
                      className="px-3 py-2 hover:bg-accent cursor-pointer transition-colors"
                    >
                      <div className="font-medium text-sm">
                        {link.device_a_code} → {link.device_z_code}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {link.device_a_location_name} → {link.device_z_location_name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {link.link_code}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.locations.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                    Locations
                  </div>
                  {searchResults.locations.map((location) => (
                    <div
                      key={location.location_pk}
                      onClick={() => {
                        setOpen(false);
                        setSearch("");
                      }}
                      className="px-3 py-2 hover:bg-accent cursor-pointer transition-colors"
                    >
                      <div className="font-medium text-sm">{location.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {location.code} • {location.device_count} devices
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </div>

      {selectedLink && (
        <div className="rounded-lg border border-border bg-background/95 backdrop-blur-sm p-3 shadow-md">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Viewing Link
              </div>
              <div className="font-semibold text-sm text-foreground mb-1">
                {selectedLink.device_a_code} → {selectedLink.device_z_code}
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedLink.device_a_location_name} → {selectedLink.device_z_location_name}
              </div>
            </div>
            <div className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${
              selectedLink.health_status === 'HEALTHY'
                ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                : selectedLink.health_status === 'DRIFT_HIGH'
                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}>
              {selectedLink.health_status.replace('_', ' ')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
