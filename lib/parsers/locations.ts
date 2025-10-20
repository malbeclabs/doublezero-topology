/**
 * Location Parser
 *
 * Extracts and transforms location data from snapshot.json for map visualization.
 */

import type { Location } from "@/types/topology";

/**
 * Parse locations from snapshot JSON data
 *
 * @param snapshotData - Parsed snapshot.json content
 * @returns Array of locations with coordinates and metadata
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseLocations(snapshotData: any): Location[] {
  const locationsObj =
    snapshotData?.fetch_data?.dz_serviceability?.locations || {};

  const locations: Location[] = [];

  for (const [locationPk, locationData] of Object.entries(locationsObj)) {
    const data = locationData as Record<string, unknown>;

    // Skip locations without valid coordinates
    const lat = data.lat as number;
    const lng = data.lng as number;

    if (
      lat === null ||
      lat === undefined ||
      lng === null ||
      lng === undefined ||
      isNaN(lat) ||
      isNaN(lng)
    ) {
      console.warn(
        `Skipping location ${locationPk}: invalid coordinates`,
        data
      );
      continue;
    }

    // Validate lat/lng ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn(
        `Skipping location ${locationPk}: out of range coordinates`,
        { lat, lng }
      );
      continue;
    }

    locations.push({
      location_pk: locationPk,
      code: (data.code as string) || locationPk,
      name: (data.name as string) || "Unknown",
      lat,
      lon: lng, // Note: internally we use 'lon' for consistency with deck.gl [lon, lat] order
      country: (data.country as string) || undefined,
      device_count: 0, // Legacy function - device count not available
      devices: [], // Legacy function - device list not available
      reference_count: (data.reference_count as number) || 0,
    });
  }

  return locations;
}

/**
 * Build a map of location_pk to coordinates for fast lookup
 *
 * @param locations - Array of parsed locations
 * @returns Map of location_pk to [lon, lat] coordinates
 */
export function buildLocationCoordinateMap(
  locations: Location[]
): Map<string, [number, number]> {
  const map = new Map<string, [number, number]>();

  for (const location of locations) {
    // deck.gl uses [longitude, latitude] order
    map.set(location.location_pk, [location.lon, location.lat]);
  }

  return map;
}

/**
 * Get coordinates for a location by primary key
 *
 * @param locationPk - Location primary key
 * @param coordinateMap - Map of location_pk to coordinates
 * @returns [lon, lat] or null if not found
 */
export function getLocationCoordinates(
  locationPk: string,
  coordinateMap: Map<string, [number, number]>
): [number, number] | null {
  return coordinateMap.get(locationPk) || null;
}
