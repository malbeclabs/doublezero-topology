"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import Map, { Source, Layer, Marker } from "react-map-gl/maplibre";
import type { MapRef, ViewState } from "react-map-gl/maplibre";
import type { LayerProps } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import { X } from "lucide-react";

import type { TopologyLink, Location, HealthStatus } from "@/types/topology";
import { generateGeodesicArc, shouldUseGeodesicArc } from "@/lib/geodesic";
import { useTableStore } from "@/lib/stores/table-store";
import { usePathStore } from "@/lib/stores/path-store";
import { useMapModeStore } from "@/lib/stores/map-mode-store";
import { ZoomControls } from "./ZoomControls";

interface MapboxMapProps {
  links: TopologyLink[];
  locations: Location[];
  visibleStatuses?: Set<HealthStatus>;
  showLinks?: boolean;
  showNodes?: boolean;
  /** Callback when the current hop index changes (for dynamic highlighting) */
  onCurrentHopChange?: (hopIndex: number | null) => void;
}

interface LinkProperties {
  link_pk: string;
  link_code: string;
  device_a: string;
  device_z: string;
  location_a: string;
  location_z: string;
  expected_delay_us: number;
  measured_p50_us: number | null;
  measured_p90_us: number | null;
  measured_p95_us: number | null;
  measured_p99_us: number | null;
  isis_metric: number | null;
  drift_pct: number | null;
  health_status: string;
  bandwidth_gbps: number | null;
  bandwidth_label: string;
  color: string;
  width: number;
  opacity: number;
}

interface NodeProperties {
  location_pk: string;
  code: string;
  name: string;
  country: string;
  device_count: number;
  devices: string;
  reference_count: number;
}

const INITIAL_VIEW_STATE: Partial<ViewState> = {
  longitude: -98.5795,
  latitude: 39.8283,
  zoom: 3.5,
};

const MAP_STYLE_LIGHT = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const MAP_STYLE_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

function getLineWidth(link: TopologyLink): number {
  // Base width determined by bandwidth tier
  let baseWidth = 2; // Default

  // Use bandwidth_gbps to determine width
  const gbps = link.bandwidth_gbps;
  if (gbps !== null) {
    if (gbps >= 200) {
      baseWidth = 10; // 200+ Gbps
    } else if (gbps >= 100) {
      baseWidth = 8; // 100-200 Gbps
    } else if (gbps >= 50) {
      baseWidth = 5; // 50-100 Gbps
    } else {
      baseWidth = 3; // < 50 Gbps
    }
  }

  // Make MISSING_ISIS links slightly more prominent (add 1px)
  if (link.data_status === "MISSING_ISIS") {
    baseWidth += 1;
  }

  return baseWidth;
}

function getLineOpacity(link: TopologyLink): number {
  return link.health_status === "HEALTHY" ? 0.6 : 0.9;
}

/**
 * Get link color based on health status and bandwidth tier
 * Priority: Health issues override bandwidth colors for visibility
 *
 * Healthy links (color by bandwidth):
 * - 10 Gbps: Light green (#22c55e)
 * - 50 Gbps: Medium teal (#14b8a6)
 * - 100 Gbps: Dark teal (#0d9488)
 * - 200+ Gbps: Deep sky blue (#0284c7)
 *
 * Unhealthy links (color by health status):
 * - DRIFT_HIGH: Orange (#f97316)
 * - MISSING_TELEMETRY: Yellow (#eab308)
 * - MISSING_ISIS: Red (#ef4444)
 * - No data: Gray (#94a3b8)
 */
function getLinkColor(link: TopologyLink): string {
  // Health issues take precedence (for visibility)
  if (link.health_status === "DRIFT_HIGH") {
    return "#f97316"; // orange-500
  }

  if (link.health_status === "MISSING_TELEMETRY") {
    return "#eab308"; // yellow-500
  }

  if (link.health_status === "MISSING_ISIS") {
    return "#ef4444"; // red-500
  }

  // For healthy links, color by bandwidth tier
  if (link.health_status === "HEALTHY") {
    const gbps = link.bandwidth_gbps;

    if (gbps === null) {
      return "#94a3b8"; // slate-400 (no bandwidth data)
    }

    if (gbps >= 200) {
      return "#0284c7"; // sky-600 (200+ Gbps) - Deep blue
    } else if (gbps >= 100) {
      return "#0d9488"; // teal-600 (100-200 Gbps) - Dark teal
    } else if (gbps >= 50) {
      return "#14b8a6"; // teal-500 (50-100 Gbps) - Medium teal
    } else {
      return "#22c55e"; // green-500 (< 50 Gbps) - Light green
    }
  }

  // Fallback to gray for unknown states
  return "#94a3b8"; // slate-400
}

function linksToGeoJSON(
  links: TopologyLink[],
  selectedLinkPk: string | null = null,
  hoveredLinkPk: string | null = null,
  hasActivePath: boolean = false,
  useGeodesic: boolean = true,
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = links
    .map((link) => {
      const sourceCoords: [number, number] = [link.device_a_lon, link.device_a_lat];
      const targetCoords: [number, number] = [link.device_z_lon, link.device_z_lat];

      const shouldUseArc = useGeodesic && shouldUseGeodesicArc(sourceCoords, targetCoords);
      const coordinates = shouldUseArc
        ? generateGeodesicArc(sourceCoords, targetCoords)
        : [sourceCoords, targetCoords];

      // Use bandwidth + health status for coloring
      const hexColor = getLinkColor(link);

      const isSelected = link.link_pk === selectedLinkPk;
      const isHovered = link.link_pk === hoveredLinkPk;

      let width = getLineWidth(link);
      let opacity = getLineOpacity(link);

      if (isSelected) {
        width = Math.max(width * 2, 6);
        opacity = 1.0;
      } else if (isHovered) {
        width = Math.max(width * 1.5, 4);
        opacity = Math.min(opacity + 0.2, 1.0);
      } else if (selectedLinkPk || hoveredLinkPk) {
        opacity = opacity * 0.3;
      } else if (hasActivePath) {
        // Fade background links when path is active
        opacity = opacity * 0.3;
      }

      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates,
        },
        properties: {
          link_pk: link.link_pk,
          link_code: link.link_code,
          device_a: link.device_a_code,
          device_z: link.device_z_code,
          location_a: link.device_a_location_name,
          location_z: link.device_z_location_name,
          expected_delay_us: link.expected_delay_us,
          measured_p50_us: link.measured_p50_us,
          measured_p90_us: link.measured_p90_us,
          measured_p95_us: link.measured_p95_us,
          measured_p99_us: link.measured_p99_us,
          isis_metric: link.isis_metric,
          drift_pct: link.drift_pct,
          health_status: link.health_status,
          bandwidth_gbps: link.bandwidth_gbps,
          bandwidth_label: link.bandwidth_label,
          color: hexColor,
          width,
          opacity,
        },
      } as GeoJSON.Feature;
    })
    .filter(Boolean) as GeoJSON.Feature[];

  return {
    type: "FeatureCollection",
    features,
  };
}

function locationsToGeoJSON(locations: Location[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = locations.map((location) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [location.lon, location.lat],
    },
    properties: {
      location_pk: location.location_pk,
      code: location.code,
      name: location.name,
      country: location.country || "",
      device_count: location.device_count,
      devices: location.devices.join(', '),
      reference_count: location.reference_count || 0,
    },
  }));

  return {
    type: "FeatureCollection",
    features,
  };
}

/**
 * Convert computed path to GeoJSON for rendering
 */
function pathToGeoJSON(
  computedPath: import("@/lib/graph/types").NetworkPath | null,
  useGeodesic: boolean = true,
): GeoJSON.FeatureCollection {
  if (!computedPath) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  const features: GeoJSON.Feature[] = [];

  // Create line segments for each hop
  for (let i = 0; i < computedPath.hops.length - 1; i++) {
    const sourceHop = computedPath.hops[i];
    const targetHop = computedPath.hops[i + 1];
    const link = computedPath.links[i];

    const sourceCoords: [number, number] = [sourceHop.longitude, sourceHop.latitude];
    const targetCoords: [number, number] = [targetHop.longitude, targetHop.latitude];

    const shouldUseArc = useGeodesic && shouldUseGeodesicArc(sourceCoords, targetCoords);
    const coordinates = shouldUseArc
      ? generateGeodesicArc(sourceCoords, targetCoords)
      : [sourceCoords, targetCoords];

    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates,
      },
      properties: {
        hop_index: i,
        source_name: sourceHop.name,
        target_name: targetHop.name,
        latency_us: link?.latencyUs || 0,
        bandwidth_gbps: link?.bandwidthGbps || null,
        health_status: link?.healthStatus || "UNKNOWN",
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

export function MapboxMap({
  links,
  locations,
  visibleStatuses,
  showLinks = true,
  showNodes = true,
  onCurrentHopChange,
}: MapboxMapProps) {
  const mapRef = useRef<MapRef>(null);
  const lastZoomedLinkPk = useRef<string | null>(null);
  const lastFittedPathId = useRef<string | null>(null);
  const hasUserMovedMap = useRef<boolean>(false);
  const [hoveredLink, setHoveredLink] = useState<LinkProperties | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NodeProperties | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [pinnedLink, setPinnedLink] = useState<LinkProperties | null>(null);
  const [pinnedNode, setPinnedNode] = useState<NodeProperties | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Animated packet state - position along the path (0 to 1)
  const [packetProgress, setPacketProgress] = useState(0);

  const { resolvedTheme } = useTheme();
  const { selectedLinkPk, hoveredLinkPk, setSelectedLink, setHoveredLink: setHoveredLinkStore } = useTableStore();
  const { computedPath, hasPath } = usePathStore();
  const { isPathActiveMode } = useMapModeStore();

  // Extract boolean values for useEffect dependencies
  const hasComputedPath = hasPath();
  const isInPathActiveMode = isPathActiveMode();

  const mapStyle = resolvedTheme === "dark" ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;

  const filteredLocations = useMemo(() => {
    return locations.filter(loc => loc.device_count > 0);
  }, [locations]);

  const filteredLinks = useMemo(() => {
    if (!visibleStatuses || visibleStatuses.size === 0) {
      return links;
    }
    return links.filter(link => visibleStatuses.has(link.health_status));
  }, [links, visibleStatuses]);

  const linksGeoJSON = useMemo(() => {
    return linksToGeoJSON(filteredLinks, selectedLinkPk, hoveredLinkPk, hasPath());
  }, [filteredLinks, selectedLinkPk, hoveredLinkPk, hasPath]);

  const locationsGeoJSON = useMemo(() => {
    return locationsToGeoJSON(filteredLocations);
  }, [filteredLocations]);

  const pathGeoJSON = useMemo(() => {
    return pathToGeoJSON(computedPath);
  }, [computedPath]);

  // Generate arrow markers along the path for directionality
  const pathArrowsGeoJSON = useMemo(() => {
    if (!computedPath) {
      return {
        type: "FeatureCollection" as const,
        features: [],
      };
    }

    const features = computedPath.links
      .map((link, index) => {
        const sourceHop = computedPath.hops[index];
        const destHop = computedPath.hops[index + 1];

        // Find locations for source and destination
        const sourceLoc = locations.find(loc => loc.devices.includes(sourceHop.id));
        const destLoc = locations.find(loc => loc.devices.includes(destHop.id));

        if (!sourceLoc || !destLoc) return null;

        // Calculate midpoint of the link
        const midLon = (sourceLoc.lon + destLoc.lon) / 2;
        const midLat = (sourceLoc.lat + destLoc.lat) / 2;

        // Calculate bearing (angle) from source to destination
        const dLon = destLoc.lon - sourceLoc.lon;
        const dLat = destLoc.lat - sourceLoc.lat;
        const bearing = Math.atan2(dLon, dLat) * (180 / Math.PI);

        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [midLon, midLat],
          },
          properties: {
            bearing,
            linkId: link.id,
          },
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [computedPath, locations]);

  // Calculate packet position along the path based on progress
  const packetPosition = useMemo(() => {
    if (!computedPath) return null;

    // Collect all coordinates from the path
    const allCoords: [number, number][] = [];
    for (let i = 0; i < computedPath.hops.length - 1; i++) {
      const sourceHop = computedPath.hops[i];
      const targetHop = computedPath.hops[i + 1];
      const sourceCoords: [number, number] = [sourceHop.longitude, sourceHop.latitude];
      const targetCoords: [number, number] = [targetHop.longitude, targetHop.latitude];

      // Generate arc or straight line
      const shouldUseArc = shouldUseGeodesicArc(sourceCoords, targetCoords);
      const coords = shouldUseArc
        ? generateGeodesicArc(sourceCoords, targetCoords)
        : [sourceCoords, targetCoords];

      // Add coords (skip first if not the first segment to avoid duplicates)
      if (i === 0) {
        allCoords.push(...coords);
      } else {
        allCoords.push(...coords.slice(1));
      }
    }

    if (allCoords.length === 0) return null;

    // Calculate index along the path
    const totalPoints = allCoords.length - 1;
    const rawIndex = packetProgress * totalPoints;
    const index = Math.floor(rawIndex);
    const t = rawIndex - index; // Interpolation factor

    if (index >= totalPoints) {
      // At the end
      return {
        lon: allCoords[totalPoints][0],
        lat: allCoords[totalPoints][1],
      };
    }

    // Interpolate between two points
    const [lon1, lat1] = allCoords[index];
    const [lon2, lat2] = allCoords[index + 1];

    return {
      lon: lon1 + (lon2 - lon1) * t,
      lat: lat1 + (lat2 - lat1) * t,
    };
  }, [computedPath, packetProgress]);

  // Calculate which hop segment the packet is currently traversing
  // Must match the exact coordinate calculation logic used for packet position
  const currentHopIndex = useMemo(() => {
    if (!computedPath || packetProgress === 0) return null;

    // Build the same coordinate array as packet position calculation
    const allCoords: [number, number][] = [];
    const segmentBoundaries: number[] = [0]; // Track where each segment starts in the coordinate array

    for (let i = 0; i < computedPath.hops.length - 1; i++) {
      const sourceHop = computedPath.hops[i];
      const targetHop = computedPath.hops[i + 1];
      const sourceCoords: [number, number] = [sourceHop.longitude, sourceHop.latitude];
      const targetCoords: [number, number] = [targetHop.longitude, targetHop.latitude];

      // Generate arc or straight line (same logic as packet position)
      const shouldUseArc = shouldUseGeodesicArc(sourceCoords, targetCoords);
      const coords = shouldUseArc
        ? generateGeodesicArc(sourceCoords, targetCoords)
        : [sourceCoords, targetCoords];

      // Add coords (skip first if not the first segment to avoid duplicates)
      if (i === 0) {
        allCoords.push(...coords);
      } else {
        allCoords.push(...coords.slice(1));
      }

      // Track where this segment ends (next segment will start here)
      segmentBoundaries.push(allCoords.length - 1);
    }

    if (allCoords.length === 0) return null;

    // Calculate current coordinate index (same as packet position)
    const totalPoints = allCoords.length - 1;
    const currentIndex = Math.floor(packetProgress * totalPoints);

    // Find which segment this coordinate index belongs to
    for (let segmentIdx = 0; segmentIdx < segmentBoundaries.length - 1; segmentIdx++) {
      const segmentStart = segmentBoundaries[segmentIdx];
      const segmentEnd = segmentBoundaries[segmentIdx + 1];

      if (currentIndex >= segmentStart && currentIndex <= segmentEnd) {
        return segmentIdx;
      }
    }

    // Fallback: last segment
    return segmentBoundaries.length - 2;
  }, [computedPath, packetProgress]);

  // Notify parent component when current hop changes (for dynamic highlighting)
  useEffect(() => {
    if (onCurrentHopChange) {
      onCurrentHopChange(currentHopIndex);
    }
  }, [currentHopIndex, onCurrentHopChange]);

  useEffect(() => {
    if (!selectedLinkPk) {
      setPinnedLink(null);
      setPinnedNode(null);
    } else {
      // When a link is selected (e.g., from table navigation), show its details panel
      const link = links.find(l => l.link_pk === selectedLinkPk);
      if (link) {
        const linkProps: LinkProperties = {
          link_pk: link.link_pk,
          link_code: link.link_code,
          location_a: link.device_a_location_name,
          location_z: link.device_z_location_name,
          device_a: link.device_a_code,
          device_z: link.device_z_code,
          expected_delay_us: link.expected_delay_us,
          measured_p50_us: link.measured_p50_us,
          measured_p90_us: link.measured_p90_us,
          measured_p95_us: link.measured_p95_us,
          measured_p99_us: link.measured_p99_us,
          isis_metric: link.isis_metric,
          drift_pct: link.drift_pct,
          health_status: link.health_status,
          bandwidth_gbps: link.bandwidth_gbps,
          bandwidth_label: link.bandwidth_label,
          color: '#000000', // Placeholder, not used in pinned panel
          width: 2,         // Placeholder, not used in pinned panel
          opacity: 1,       // Placeholder, not used in pinned panel
        };
        setPinnedLink(linkProps);
        setPinnedNode(null);
      }
    }
  }, [selectedLinkPk, links]);

  useEffect(() => {
    // Only auto-zoom if this is a new link selection (not already zoomed to this link)
    if (!selectedLinkPk || !mapRef.current || !mapReady) {
      // Reset tracking when no link is selected
      if (!selectedLinkPk) {
        lastZoomedLinkPk.current = null;
      }
      return;
    }

    // Skip if we've already zoomed to this link
    if (lastZoomedLinkPk.current === selectedLinkPk) {
      return;
    }

    const link = links.find(l => l.link_pk === selectedLinkPk);
    if (!link) return;

    const map = mapRef.current.getMap();
    if (!map) return;

    // Wait for map to be fully loaded before zooming
    const performZoom = () => {
      const startLon = link.device_a_lon;
      const startLat = link.device_a_lat;
      const endLon = link.device_z_lon;
      const endLat = link.device_z_lat;

      const minLon = Math.min(startLon, endLon);
      const maxLon = Math.max(startLon, endLon);
      const minLat = Math.min(startLat, endLat);
      const maxLat = Math.max(startLat, endLat);

      const lonDiff = maxLon - minLon;
      const latDiff = maxLat - minLat;

      // For same-location links (or very close), use a small fixed padding
      // Otherwise use 10% of the distance as padding
      const lonPadding = lonDiff < 0.01 ? 0.05 : lonDiff * 0.1;
      const latPadding = latDiff < 0.01 ? 0.05 : latDiff * 0.1;

      mapRef.current?.fitBounds(
        [
          [minLon - lonPadding, minLat - latPadding],
          [maxLon + lonPadding, maxLat + latPadding],
        ],
        {
          padding: 80,
          duration: 1000,
          maxZoom: 10,
        }
      );

      // Mark this link as zoomed
      lastZoomedLinkPk.current = selectedLinkPk;
    };

    // If map is already loaded, zoom immediately
    const isLoaded = map.isStyleLoaded() && map.loaded();

    if (isLoaded) {
      performZoom();
    } else {
      // The map may be loading or the load event already fired
      // Try both: wait for load event AND use a timeout as fallback
      let hasZoomed = false;

      const zoomOnce = () => {
        if (!hasZoomed) {
          hasZoomed = true;
          performZoom();
        }
      };

      // Listen for load event
      map.once('load', zoomOnce);

      // Also try after a short delay as fallback
      setTimeout(() => {
        if (!hasZoomed && map.isStyleLoaded()) {
          zoomOnce();
        }
      }, 500);
    }
  }, [selectedLinkPk, links, mapReady]);

  // Auto-fit map to computed path
  useEffect(() => {
    if (!computedPath || !mapRef.current || !mapReady || !isPathActiveMode()) {
      // Reset tracking when no path is active
      if (!computedPath) {
        lastFittedPathId.current = null;
        hasUserMovedMap.current = false;
      }
      return;
    }

    // Create a unique ID for this path based on source, destination, and strategy
    const pathId = `${computedPath.source.id}-${computedPath.destination.id}`;

    // Skip if we've already fitted to this path AND user has moved the map
    if (lastFittedPathId.current === pathId && hasUserMovedMap.current) {
      return;
    }

    const map = mapRef.current.getMap();
    if (!map) return;

    // Wait for map to be fully loaded before fitting
    const performFit = () => {
      // Get all coordinates from path hops
      const allCoordinates = locations
        .filter(loc => computedPath.hops.some(hop => hop.id === loc.devices[0]))
        .map(loc => [loc.lon, loc.lat]);

      if (allCoordinates.length === 0) return;

      // Calculate bounds from all coordinates
      const lons = allCoordinates.map(coord => coord[0]);
      const lats = allCoordinates.map(coord => coord[1]);

      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);

      const lonDiff = maxLon - minLon;
      const latDiff = maxLat - minLat;

      // Add padding (10% of distance or minimum for short paths)
      const lonPadding = lonDiff < 0.01 ? 0.05 : lonDiff * 0.1;
      const latPadding = latDiff < 0.01 ? 0.05 : latDiff * 0.1;

      mapRef.current?.fitBounds(
        [
          [minLon - lonPadding, minLat - latPadding],
          [maxLon + lonPadding, maxLat + latPadding],
        ],
        {
          padding: 100,
          duration: 1000,
          maxZoom: 8,
        }
      );

      // Mark this path as fitted and reset user movement tracking
      lastFittedPathId.current = pathId;
      hasUserMovedMap.current = false;
    };

    // If map is already loaded, fit immediately
    const isLoaded = map.isStyleLoaded() && map.loaded();

    if (isLoaded) {
      performFit();
    } else {
      // Wait for map to load
      let hasFitted = false;

      const fitOnce = () => {
        if (!hasFitted) {
          hasFitted = true;
          performFit();
        }
      };

      map.once('load', fitOnce);

      setTimeout(() => {
        if (!hasFitted && map.isStyleLoaded()) {
          fitOnce();
        }
      }, 500);
    }
  }, [computedPath, mapReady, isPathActiveMode, locations]);

  // Animate packet flowing along the path
  useEffect(() => {
    if (!hasComputedPath || !isInPathActiveMode) {
      setPacketProgress(0);
      return;
    }

    let animationFrameId: number;
    let startTime: number | null = null;
    const duration = 5000; // 5 seconds for full path traversal

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Calculate progress (0 to 1) and loop
      const progress = (elapsed % duration) / duration;
      setPacketProgress(progress);

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [hasComputedPath, isInPathActiveMode]);

  const lineLayer: LayerProps = {
    id: "network-links",
    type: "line",
    source: "links",
    layout: {
      "line-join": "round",
      "line-cap": "round",
      visibility: showLinks ? "visible" : "none",
    },
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["get", "width"],
      "line-opacity": ["get", "opacity"],
    },
  };

  const circleLayer: LayerProps = {
    id: "network-nodes",
    type: "circle",
    source: "locations",
    layout: {
      visibility: showNodes ? "visible" : "none",
    },
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        3,
        ["max", ["*", ["get", "device_count"], 0.5], 3],
        10,
        ["max", ["*", ["get", "device_count"], 2], 5],
      ],
      "circle-color": "#3b82f6",
      "circle-opacity": 0.8,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#1e40af",
      "circle-stroke-opacity": 0.5,
    },
  };

  const handleMapClick = (event: maplibregl.MapMouseEvent) => {
    const map = mapRef.current?.getMap();
    if (!map || !map.isStyleLoaded()) return;

    if (!map.getLayer("network-links") || !map.getLayer("network-nodes")) {
      return;
    }

    const features = map.queryRenderedFeatures(event.point, {
      layers: ["network-links", "network-nodes"],
    });

    if (features.length > 0) {
      const feature = features[0];

      if (feature.layer.id === "network-links") {
        // In path-active mode, don't allow link clicking
        if (isPathActiveMode()) {
          return;
        }

        const linkProps = feature.properties as LinkProperties;
        const linkPk = linkProps.link_pk;

        if (linkPk === selectedLinkPk) {
          setSelectedLink(null);
          setPinnedLink(null);
        } else {
          setSelectedLink(linkPk);
          setPinnedLink(linkProps);
          setPinnedNode(null);
        }
      } else if (feature.layer.id === "network-nodes") {
        // Show node details
        const nodeProps = feature.properties as NodeProperties;
        setPinnedNode(nodeProps);
        setPinnedLink(null);
        setSelectedLink(null);
      }
    } else {
      setSelectedLink(null);
      setPinnedLink(null);
      setPinnedNode(null);
    }
  };

  const handleMouseMove = (event: maplibregl.MapMouseEvent) => {
    const map = mapRef.current?.getMap();
    if (!map || !map.isStyleLoaded()) return;

    if (!map.getLayer("network-links") || !map.getLayer("network-nodes")) {
      return;
    }

    const features = map.queryRenderedFeatures(event.point, {
      layers: ["network-links", "network-nodes"],
    });

    if (features.length > 0) {
      const feature = features[0];

      if (feature.layer.id === "network-links") {
        const linkProps = feature.properties as LinkProperties;
        setHoveredLink(linkProps);
        setHoveredNode(null);
        setHoveredLinkStore(linkProps.link_pk);
        map.getCanvas().style.cursor = "pointer";
      } else if (feature.layer.id === "network-nodes") {
        setHoveredNode(feature.properties as NodeProperties);
        setHoveredLink(null);
        setHoveredLinkStore(null);
        map.getCanvas().style.cursor = "pointer";
      }

      setCursorPosition({ x: event.point.x, y: event.point.y });
    } else {
      setHoveredLink(null);
      setHoveredNode(null);
      setHoveredLinkStore(null);
      setCursorPosition(null);
      map.getCanvas().style.cursor = "";
    }
  };

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle={mapStyle}
        attributionControl={false}
        onClick={handleMapClick}
        onMouseMove={handleMouseMove}
        onMove={() => {
          // Track user interaction (pan/zoom) to determine re-fit behavior
          if (computedPath) {
            hasUserMovedMap.current = true;
          }
        }}
        onLoad={() => setMapReady(true)}
        interactiveLayerIds={["network-links", "network-nodes"]}
      >
        <Source id="links" type="geojson" data={linksGeoJSON}>
          <Layer {...lineLayer} />
        </Source>

        <Source id="locations" type="geojson" data={locationsGeoJSON}>
          <Layer {...circleLayer} />
        </Source>

        {/* Computed Path Layer */}
        {hasPath() && computedPath && (
          <>
            <Source id="computed-path" type="geojson" data={pathGeoJSON}>
              {/* Outer glow layer - subtle halo effect */}
              <Layer
                id="computed-path-glow"
                type="line"
                paint={{
                  "line-color": "#3b82f6", // Blue
                  "line-width": isPathActiveMode() ? 10 : 8,
                  "line-opacity": isPathActiveMode() ? 0.25 : 0.2,
                  "line-blur": 4,
                }}
                layout={{
                  "line-join": "round",
                  "line-cap": "round",
                }}
              />

              {/* Main path layer - solid blue line */}
              <Layer
                id="computed-path-layer"
                type="line"
                paint={{
                  "line-color": "#3b82f6", // Blue
                  "line-width": isPathActiveMode() ? 5 : 4,
                  "line-opacity": isPathActiveMode() ? 0.85 : 0.75,
                  "line-blur": 0.5, // Subtle blur for softer appearance
                }}
                layout={{
                  "line-join": "round",
                  "line-cap": "round",
                }}
              />
            </Source>

            {/* Arrow markers for directionality */}
            <Source id="path-arrows" type="geojson" data={pathArrowsGeoJSON}>
              <Layer
                id="path-arrows-layer"
                type="symbol"
                layout={{
                  "icon-image": "", // No icon, use text instead
                  "text-field": "▶", // Unicode right-pointing triangle
                  "text-size": 12,
                  "text-rotate": ["get", "bearing"],
                  "text-rotation-alignment": "map",
                  "text-keep-upright": false,
                  "text-allow-overlap": true,
                  "text-ignore-placement": true,
                }}
                paint={{
                  "text-color": "#ffffff", // White arrows
                  "text-halo-color": "#3b82f6", // Blue halo matching path
                  "text-halo-width": 1.5,
                  "text-opacity": isPathActiveMode() ? 0.75 : 0.65,
                }}
              />
            </Source>

            {/* Source Marker (Green) */}
            <Marker
              longitude={computedPath.source.longitude}
              latitude={computedPath.source.latitude}
              anchor="center"
            >
              <div
                className="w-3 h-3 rounded-full border-2 border-white shadow-lg"
                style={{ backgroundColor: "#22c55e" }}
                title={`Source: ${computedPath.source.name}`}
              />
            </Marker>

            {/* Destination Marker (Red) */}
            <Marker
              longitude={computedPath.destination.longitude}
              latitude={computedPath.destination.latitude}
              anchor="center"
            >
              <div
                className="w-3 h-3 rounded-full border-2 border-white shadow-lg"
                style={{ backgroundColor: "#ef4444" }}
                title={`Destination: ${computedPath.destination.name}`}
              />
            </Marker>

            {/* Animated Packet Marker */}
            {packetPosition && (
              <Marker
                longitude={packetPosition.lon}
                latitude={packetPosition.lat}
                anchor="center"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-lg animate-pulse"
                  style={{ backgroundColor: "#fbbf24" }}
                  title="Packet flow"
                />
              </Marker>
            )}
          </>
        )}
      </Map>
      {cursorPosition && (hoveredLink || hoveredNode) && !pinnedLink && !pinnedNode && (
        <div
          className="absolute z-[2000] pointer-events-none px-5 py-4 rounded-lg text-sm max-w-md bg-background border border-border"
          style={{
            left: cursorPosition.x + 20,
            top: cursorPosition.y + 20,
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          {hoveredLink && (
            <div>
              {/* Title */}
              <div className="text-lg font-bold mb-3 pb-3 border-b border-border text-foreground">
                {hoveredLink.location_a} → {hoveredLink.location_z}
              </div>

              {/* Simplified content */}
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Link Code:</span>
                  <span className="font-mono text-xs font-medium text-foreground">
                    {hoveredLink.link_code || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Status:</span>
                  <span
                    className={`inline-block px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide ${
                      hoveredLink.health_status === 'HEALTHY'
                        ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                        : hoveredLink.health_status === 'DRIFT_HIGH'
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {hoveredLink.health_status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Bandwidth:</span>
                  <span className="font-semibold text-foreground">
                    {hoveredLink.bandwidth_label || 'N/A'}
                  </span>
                </div>
                {hoveredLink.drift_pct !== null && (
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Drift:</span>
                    <span className={`font-semibold ${
                      hoveredLink.drift_pct >= 20
                        ? 'text-red-600 dark:text-red-400'
                        : hoveredLink.drift_pct >= 10
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {hoveredLink.drift_pct.toFixed(2)}%
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Expected Delay:</span>
                  <span className="font-medium text-foreground">
                    {(hoveredLink.expected_delay_us / 1000).toFixed(2)} ms
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Measured (P90):</span>
                  <span className="font-medium text-foreground">
                    {hoveredLink.measured_p90_us !== null
                      ? `${(hoveredLink.measured_p90_us / 1000).toFixed(2)} ms`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Measured (P95):</span>
                  <span className="font-medium text-foreground">
                    {hoveredLink.measured_p95_us !== null
                      ? `${(hoveredLink.measured_p95_us / 1000).toFixed(2)} ms`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Measured (P99):</span>
                  <span className="font-medium text-foreground">
                    {hoveredLink.measured_p99_us !== null
                      ? `${(hoveredLink.measured_p99_us / 1000).toFixed(2)} ms`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-muted-foreground">IS-IS Metric:</span>
                  <span className="font-medium text-foreground">
                    {hoveredLink.isis_metric !== null
                      ? `${(hoveredLink.isis_metric / 1000).toFixed(2)} ms`
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {hoveredNode && (
            <div>
              {/* Title */}
              <div className="text-lg font-bold mb-3 pb-3 border-b border-border text-foreground">
                {hoveredNode.name}
                {hoveredNode.country && hoveredNode.country !== '' ? `, ${hoveredNode.country}` : ''}
              </div>

              {/* Location Details */}
              <div className="mb-4">
                <div className="text-xs font-semibold uppercase tracking-wide mb-2 text-muted-foreground">
                  Location Details
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Code:</span>
                    <span className="font-mono text-xs font-medium text-foreground">{hoveredNode.code}</span>
                  </div>
                </div>
              </div>

              {/* Network Statistics */}
              <div className="mb-4">
                <div className="text-xs font-semibold uppercase tracking-wide mb-2 text-muted-foreground">
                  Network Statistics
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-muted-foreground">Total Devices:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{hoveredNode.device_count}</span>
                  </div>
                </div>
              </div>

              {/* Device List */}
              {hoveredNode.devices && hoveredNode.device_count > 0 && (
                <div className="mt-3 px-3 py-2.5 rounded-lg bg-muted border border-border">
                  <div className="font-semibold mb-2 text-xs text-foreground">
                    Devices:
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {hoveredNode.devices.split(', ').map((device: string, i: number) => (
                      <div key={i} className="font-mono">• {device}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pinned tooltip (fixed position, bottom-right) */}
      {(pinnedLink || pinnedNode) && (
        <div className="absolute bottom-4 right-4 z-[2001] w-96 max-h-[80vh] overflow-y-auto px-5 py-4 rounded-lg text-sm bg-background border border-border shadow-2xl">
          {/* Close button */}
          <button
            onClick={() => {
              setPinnedLink(null);
              setPinnedNode(null);
              setSelectedLink(null);
            }}
            className="absolute top-3 right-3 p-1 rounded-md hover:bg-accent transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {pinnedLink && (
            <div>
              {/* Title */}
              <div className="text-lg font-bold mb-3 pb-3 border-b border-border text-foreground pr-8">
                {pinnedLink.location_a} → {pinnedLink.location_z}
              </div>

              {/* Simplified content */}
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Link Code:</span>
                  <span className="font-mono text-xs font-medium text-foreground">
                    {pinnedLink.link_code || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Status:</span>
                  <span
                    className={`inline-block px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide ${
                      pinnedLink.health_status === 'HEALTHY'
                        ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                        : pinnedLink.health_status === 'DRIFT_HIGH'
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {pinnedLink.health_status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Bandwidth:</span>
                  <span className="font-semibold text-foreground">
                    {pinnedLink.bandwidth_label || 'N/A'}
                  </span>
                </div>
                {pinnedLink.drift_pct !== null && (
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Drift:</span>
                    <span className={`font-semibold ${
                      pinnedLink.drift_pct >= 20
                        ? 'text-red-600 dark:text-red-400'
                        : pinnedLink.drift_pct >= 10
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {pinnedLink.drift_pct.toFixed(2)}%
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Expected Delay:</span>
                  <span className="font-medium text-foreground">
                    {(pinnedLink.expected_delay_us / 1000).toFixed(2)} ms
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Measured (P90):</span>
                  <span className="font-medium text-foreground">
                    {pinnedLink.measured_p90_us !== null
                      ? `${(pinnedLink.measured_p90_us / 1000).toFixed(2)} ms`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Measured (P95):</span>
                  <span className="font-medium text-foreground">
                    {pinnedLink.measured_p95_us !== null
                      ? `${(pinnedLink.measured_p95_us / 1000).toFixed(2)} ms`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Measured (P99):</span>
                  <span className="font-medium text-foreground">
                    {pinnedLink.measured_p99_us !== null
                      ? `${(pinnedLink.measured_p99_us / 1000).toFixed(2)} ms`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-muted-foreground">IS-IS Metric:</span>
                  <span className="font-medium text-foreground">
                    {pinnedLink.isis_metric !== null
                      ? `${(pinnedLink.isis_metric / 1000).toFixed(2)} ms`
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {pinnedNode && (
            <div>
              {/* Title */}
              <div className="text-lg font-bold mb-3 pb-3 border-b border-border text-foreground pr-8">
                {pinnedNode.name}
                {pinnedNode.country && pinnedNode.country !== '' ? `, ${pinnedNode.country}` : ''}
              </div>

              {/* Location Details */}
              <div className="mb-4">
                <div className="text-xs font-semibold uppercase tracking-wide mb-2 text-muted-foreground">
                  Location Details
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Code:</span>
                    <span className="font-mono text-xs font-medium text-foreground">{pinnedNode.code}</span>
                  </div>
                </div>
              </div>

              {/* Network Statistics */}
              <div className="mb-4">
                <div className="text-xs font-semibold uppercase tracking-wide mb-2 text-muted-foreground">
                  Network Statistics
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-muted-foreground">Total Devices:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{pinnedNode.device_count}</span>
                  </div>
                </div>
              </div>

              {/* Device List */}
              {pinnedNode.devices && pinnedNode.device_count > 0 && (
                <div className="mt-3 px-3 py-2.5 rounded-lg bg-muted border border-border">
                  <div className="font-semibold mb-2 text-xs text-foreground">
                    Devices:
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {pinnedNode.devices.split(', ').map((device: string, i: number) => (
                      <div key={i} className="font-mono">• {device}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Zoom Controls (bottom-right) */}
      <ZoomControls mapRef={mapRef} />
    </div>
  );
}
