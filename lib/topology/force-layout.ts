/**
 * Force-Directed Layout for Network Topology Visualization
 *
 * Uses d3-force to calculate positions for locations in a network graph layout.
 * This solves the overlapping location problem by arranging nodes based on their
 * connectivity rather than geographic coordinates.
 */

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from "d3-force";
import type { TopologyLink, Location } from "@/types/topology";

interface ForceNode {
  id: string;
  x?: number;
  y?: number;
  location: Location;
}

interface ForceLink {
  source: string | ForceNode;
  target: string | ForceNode;
  link: TopologyLink;
}

/**
 * Calculate force-directed layout positions for network topology view
 *
 * @param locations - Array of location objects
 * @param links - Array of topology links
 * @returns Map of location codes to [x, y] coordinates in topology space
 */
export function calculateForceLayout(
  locations: Location[],
  links: TopologyLink[]
): Map<string, [number, number]> {
  // Create nodes from locations
  const nodes: ForceNode[] = locations.map((loc) => ({
    id: loc.code, // Use location code as unique identifier
    location: loc,
  }));

  // Create links using location codes
  const graphLinks: ForceLink[] = links
    .map((link) => {
      // Only include links where both endpoints exist in locations
      const sourceExists = nodes.some((n) => n.id === link.device_a_location_code);
      const targetExists = nodes.some((n) => n.id === link.device_z_location_code);

      if (!sourceExists || !targetExists) {
        return null;
      }

      return {
        source: link.device_a_location_code,
        target: link.device_z_location_code,
        link,
      };
    })
    .filter(Boolean) as ForceLink[];

  // Create force simulation
  const simulation = forceSimulation(nodes)
    // Link force: attracts connected nodes
    .force(
      "link",
      forceLink(graphLinks)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .id((d: any) => d.id)
        .distance(100) // Distance between connected nodes
        .strength(0.5)
    )
    // Charge force: repels all nodes from each other
    .force("charge", forceManyBody().strength(-500).distanceMax(500))
    // Center force: pulls nodes toward center
    .force("center", forceCenter(0, 0))
    // Collision force: prevents nodes from overlapping
    .force(
      "collide",
      forceCollide()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .radius((d: any) => Math.max(d.location.device_count * 5, 20))
        .strength(0.9)
    )
    .stop(); // Stop auto-running

  // Run simulation synchronously for deterministic results
  // 300 iterations is usually enough to reach equilibrium
  for (let i = 0; i < 300; ++i) {
    simulation.tick();
  }

  // Convert simulation results to coordinate map
  const coordMap = new Map<string, [number, number]>();
  for (const node of nodes) {
    if (node.x !== undefined && node.y !== undefined) {
      coordMap.set(node.id, [node.x, node.y]);
    }
  }

  return coordMap;
}

/**
 * Convert topology coordinates to geographic coordinates for Deck.gl
 *
 * Maps the force layout coordinate space to a geographic bounding box
 * centered on the US for compatibility with Deck.gl's MapView.
 *
 * @param topologyCoords - Map of location codes to topology [x, y] coordinates
 * @returns Map of location codes to geographic [longitude, latitude] coordinates
 */
export function topologyToGeographic(
  topologyCoords: Map<string, [number, number]>
): Map<string, [number, number]> {
  // Find bounds of topology space
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const [x, y] of topologyCoords.values()) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  // Map to US-centered geographic bounds
  // Longitude: -125 (west) to -65 (east)
  // Latitude: 25 (south) to 50 (north)
  const geoMinLon = -125;
  const geoMaxLon = -65;
  const geoMinLat = 25;
  const geoMaxLat = 50;

  const geoRangeLon = geoMaxLon - geoMinLon;
  const geoRangeLat = geoMaxLat - geoMinLat;

  const geoCoords = new Map<string, [number, number]>();

  for (const [code, [x, y]] of topologyCoords.entries()) {
    // Normalize to 0-1 range
    const normalizedX = (x - minX) / rangeX;
    const normalizedY = (y - minY) / rangeY;

    // Map to geographic coordinates
    // Note: y is inverted because screen coordinates go down, but latitude goes up
    const lon = geoMinLon + normalizedX * geoRangeLon;
    const lat = geoMinLat + (1 - normalizedY) * geoRangeLat;

    geoCoords.set(code, [lon, lat]);
  }

  return geoCoords;
}

/**
 * Get position for a link endpoint in topology view
 *
 * @param locationCode - Location code to look up
 * @param topologyCoords - Map of topology coordinates
 * @param fallbackLon - Fallback longitude if location not found
 * @param fallbackLat - Fallback latitude if location not found
 * @returns [longitude, latitude] coordinates
 */
export function getTopologyPosition(
  locationCode: string,
  topologyCoords: Map<string, [number, number]> | null,
  fallbackLon: number,
  fallbackLat: number
): [number, number] {
  if (!topologyCoords) {
    return [fallbackLon, fallbackLat];
  }

  const coords = topologyCoords.get(locationCode);
  return coords || [fallbackLon, fallbackLat];
}
