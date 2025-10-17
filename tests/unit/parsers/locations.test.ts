/**
 * Unit tests for location parser
 */

import { describe, it, expect } from "vitest";
import {
  parseLocations,
  buildLocationCoordinateMap,
  getLocationCoordinates,
} from "@/lib/parsers/locations";
import type { Location } from "@/types/topology";

describe("parseLocations", () => {
  it("should parse valid location data", () => {
    const snapshotData = {
      fetch_data: {
        dz_serviceability: {
          locations: {
            loc1: {
              code: "CORE-LA2",
              name: "Los Angeles",
              lat: 34.05851,
              lng: -118.23591,
              country: "US",
              reference_count: 2,
            },
            loc2: {
              code: "CORE-NYC",
              name: "New York",
              lat: 40.7128,
              lng: -74.006,
              country: "US",
              reference_count: 3,
            },
          },
        },
      },
    };

    const locations = parseLocations(snapshotData);

    expect(locations).toHaveLength(2);
    expect(locations[0]).toMatchObject({
      location_pk: "loc1",
      code: "CORE-LA2",
      name: "Los Angeles",
      lat: 34.05851,
      lon: -118.23591,
      country: "US",
      reference_count: 2,
    });
    expect(locations[1]).toMatchObject({
      location_pk: "loc2",
      code: "CORE-NYC",
      name: "New York",
      lat: 40.7128,
      lon: -74.006,
      country: "US",
      reference_count: 3,
    });
  });

  it("should handle missing locations gracefully", () => {
    const snapshotData = {
      fetch_data: {
        dz_serviceability: {},
      },
    };

    const locations = parseLocations(snapshotData);
    expect(locations).toEqual([]);
  });

  it("should skip locations with invalid coordinates", () => {
    const snapshotData = {
      fetch_data: {
        dz_serviceability: {
          locations: {
            loc1: {
              code: "VALID",
              name: "Valid Location",
              lat: 34.05851,
              lng: -118.23591,
            },
            loc2: {
              code: "INVALID-NULL",
              name: "Invalid Location (null)",
              lat: null,
              lng: -118.23591,
            },
            loc3: {
              code: "INVALID-MISSING",
              name: "Invalid Location (missing)",
              // lat and lng missing
            },
            loc4: {
              code: "INVALID-NAN",
              name: "Invalid Location (NaN)",
              lat: NaN,
              lng: -118.23591,
            },
          },
        },
      },
    };

    const locations = parseLocations(snapshotData);

    // Only valid location should be parsed
    expect(locations).toHaveLength(1);
    expect(locations[0].location_pk).toBe("loc1");
  });

  it("should skip locations with out-of-range coordinates", () => {
    const snapshotData = {
      fetch_data: {
        dz_serviceability: {
          locations: {
            loc1: {
              code: "VALID",
              name: "Valid Location",
              lat: 34.05851,
              lng: -118.23591,
            },
            loc2: {
              code: "INVALID-LAT",
              name: "Invalid Latitude",
              lat: 91, // > 90
              lng: -118.23591,
            },
            loc3: {
              code: "INVALID-LNG",
              name: "Invalid Longitude",
              lat: 34.05851,
              lng: -181, // < -180
            },
          },
        },
      },
    };

    const locations = parseLocations(snapshotData);

    // Only valid location should be parsed
    expect(locations).toHaveLength(1);
    expect(locations[0].location_pk).toBe("loc1");
  });

  it("should handle missing optional fields", () => {
    const snapshotData = {
      fetch_data: {
        dz_serviceability: {
          locations: {
            loc1: {
              // Only required fields
              lat: 34.05851,
              lng: -118.23591,
            },
          },
        },
      },
    };

    const locations = parseLocations(snapshotData);

    expect(locations).toHaveLength(1);
    expect(locations[0]).toMatchObject({
      location_pk: "loc1",
      code: "loc1", // Falls back to location_pk
      name: "Unknown", // Default name
      lat: 34.05851,
      lon: -118.23591,
    });
    expect(locations[0].country).toBeUndefined();
  });
});

describe("buildLocationCoordinateMap", () => {
  it("should build coordinate map with [lon, lat] order", () => {
    const locations: Location[] = [
      {
        location_pk: "loc1",
        code: "CORE-LA2",
        name: "Los Angeles",
        lat: 34.05851,
        lon: -118.23591,
      },
      {
        location_pk: "loc2",
        code: "CORE-NYC",
        name: "New York",
        lat: 40.7128,
        lon: -74.006,
      },
    ];

    const coordinateMap = buildLocationCoordinateMap(locations);

    expect(coordinateMap.size).toBe(2);
    expect(coordinateMap.get("loc1")).toEqual([-118.23591, 34.05851]); // [lon, lat]
    expect(coordinateMap.get("loc2")).toEqual([-74.006, 40.7128]); // [lon, lat]
  });

  it("should handle empty locations array", () => {
    const coordinateMap = buildLocationCoordinateMap([]);
    expect(coordinateMap.size).toBe(0);
  });
});

describe("getLocationCoordinates", () => {
  it("should return coordinates for existing location", () => {
    const coordinateMap = new Map<string, [number, number]>([
      ["loc1", [-118.23591, 34.05851]],
      ["loc2", [-74.006, 40.7128]],
    ]);

    const coords = getLocationCoordinates("loc1", coordinateMap);

    expect(coords).toEqual([-118.23591, 34.05851]);
  });

  it("should return null for non-existent location", () => {
    const coordinateMap = new Map<string, [number, number]>([
      ["loc1", [-118.23591, 34.05851]],
    ]);

    const coords = getLocationCoordinates("loc999", coordinateMap);

    expect(coords).toBeNull();
  });

  it("should return null for empty map", () => {
    const coordinateMap = new Map<string, [number, number]>();

    const coords = getLocationCoordinates("loc1", coordinateMap);

    expect(coords).toBeNull();
  });
});
