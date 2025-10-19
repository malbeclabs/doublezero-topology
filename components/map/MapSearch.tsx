"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, X, Link2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TopologyLink, Location } from "@/types/topology";
import { useTableStore } from "@/lib/stores/table-store";
import { useMapFilterStore } from "@/lib/stores/map-filter-store";

interface MapSearchProps {
  links: TopologyLink[];
  locations: Location[];
}

export function MapSearch({ links, locations }: MapSearchProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const { selectedLinkPk, setSelectedLink } = useTableStore();
  const { searchQuery, setSearchQuery } = useMapFilterStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const searchResults = useMemo(() => {
    if (!searchQuery) return { links: [], locations: [] };

    const searchLower = searchQuery.toLowerCase();

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
  }, [searchQuery, links, locations]);

  const totalResults = searchResults.links.length + searchResults.locations.length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" && searchQuery) {
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < totalResults - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0) {
          handleSelectByIndex(focusedIndex);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  const handleSelectByIndex = (index: number) => {
    if (index < searchResults.links.length) {
      const link = searchResults.links[index];
      handleSelectLink(link.link_pk);
    } else {
      // Location selected - just close dropdown
      setOpen(false);
      setSearchQuery("");
      setFocusedIndex(-1);
    }
  };

  const handleSelectLink = (linkPk: string) => {
    setSelectedLink(linkPk);
    setOpen(false);
    setSearchQuery("");
    setFocusedIndex(-1);
  };

  const handleClear = () => {
    setSearchQuery("");
    setSelectedLink(null);
    setOpen(false);
    setFocusedIndex(-1);
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-6 left-6 z-30 w-[420px] max-w-[calc(100vw-48px)]"
    >
      {/* Search Input */}
      <div className="relative group">
        <div className={`
          bg-background/95 backdrop-blur-sm
          border border-border rounded-xl
          shadow-lg hover:shadow-xl
          transition-all duration-200
          ${open ? 'ring-2 ring-primary/20 border-primary' : ''}
        `}>
          {/* Search Icon */}
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />

          {/* Input */}
          <input
            type="text"
            placeholder="Search links or locations..."
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls="search-results"
            className="w-full h-12 pl-12 pr-12 bg-transparent border-0 rounded-xl text-base focus:outline-none placeholder:text-muted-foreground"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOpen(e.target.value.length > 0);
              setFocusedIndex(-1);
            }}
            onFocus={() => setOpen(searchQuery.length > 0)}
            onKeyDown={handleKeyDown}
          />

          {/* Clear Button */}
          {searchQuery && (
            <button
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results Dropdown */}
        {open && searchQuery.length > 0 && (
          <div
            id="search-results"
            role="listbox"
            className="
              absolute top-[calc(100%+8px)] left-0 right-0
              bg-background/95 backdrop-blur-sm
              border border-border rounded-xl
              shadow-xl
              max-h-[400px] overflow-y-auto
              animate-in slide-in-from-top-2 fade-in-0 duration-200
            "
          >
            {searchResults.links.length === 0 && searchResults.locations.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No results found for &ldquo;{searchQuery}&rdquo;</p>
                <p className="text-xs text-muted-foreground mt-1">Try searching for a device, location, or link</p>
              </div>
            ) : (
              <div className="py-2">
                {/* Links Section */}
                {searchResults.links.length > 0 && (
                  <div className="mb-2">
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                      Links
                    </div>
                    {searchResults.links.map((link, index) => (
                      <button
                        key={link.link_pk}
                        role="option"
                        aria-selected={index === focusedIndex}
                        onClick={() => handleSelectLink(link.link_pk)}
                        className={`
                          w-full px-4 py-3
                          text-left
                          hover:bg-accent/50
                          transition-colors
                          border-b border-border last:border-0
                          focus:bg-accent focus:outline-none
                          ${index === focusedIndex ? 'bg-accent' : ''}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          {/* Icon */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Link2 className="h-4 w-4 text-primary" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate text-sm">
                              {link.device_a_code} → {link.device_z_code}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {link.device_a_location_name} → {link.device_z_location_name}
                            </div>
                          </div>

                          {/* Badge */}
                          {link.bandwidth_label && (
                            <Badge variant="secondary" className="flex-shrink-0 text-xs">
                              {link.bandwidth_label}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Locations Section */}
                {searchResults.locations.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
                      Locations
                    </div>
                    {searchResults.locations.map((location, index) => {
                      const globalIndex = searchResults.links.length + index;
                      return (
                        <button
                          key={location.location_pk}
                          role="option"
                          aria-selected={globalIndex === focusedIndex}
                          onClick={() => {
                            setOpen(false);
                            setSearchQuery("");
                            setFocusedIndex(-1);
                          }}
                          className={`
                            w-full px-4 py-3
                            text-left
                            hover:bg-accent/50
                            transition-colors
                            border-b border-border last:border-0
                            focus:bg-accent focus:outline-none
                            ${globalIndex === focusedIndex ? 'bg-accent' : ''}
                          `}
                        >
                          <div className="flex items-center gap-3">
                            {/* Icon */}
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <MapPin className="h-4 w-4 text-primary" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate text-sm">{location.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {location.code} • {location.device_count} devices
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
