/**
 * Topology API Route
 *
 * Processes uploaded snapshot.json and isis-db.json files to perform
 * three-way topology comparison and health analysis.
 *
 * POST /api/topology
 * Body: { snapshotKey: string, isisKey: string }
 * Response: { success: boolean, data?: TopologyResult, error?: string }
 */

import { z } from "zod";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET } from "@/lib/s3/client";
import type { TopologyLink, TopologyHealthSummary, Location } from "@/types/topology";
import { classifyDataCompleteness } from "@/lib/topology/data-completeness";

/**
 * Calculate median of an array of numbers
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calculate percentile of an array of numbers
 */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Parse /31 network to get both IP addresses
 */
function parseSlash31Network(tunnelNet: string | null): string[] {
  if (!tunnelNet) return [];
  try {
    const [baseIp, mask] = tunnelNet.split('/');
    if (mask !== '31') return []; // Only handle /31 networks

    const parts = baseIp.split('.').map(Number);
    const lastOctet = parts[3];

    // /31 network has 2 IPs: base and base+1
    return [
      `${parts[0]}.${parts[1]}.${parts[2]}.${lastOctet}`,
      `${parts[0]}.${parts[1]}.${parts[2]}.${lastOctet + 1}`
    ];
  } catch {
    return [];
  }
}

/**
 * Location coordinates with potential offset
 */
interface LocationCoordinates {
  location_pk: string;
  baseLat: number;
  baseLon: number;
  offsetLat: number;
  offsetLon: number;
  isOffset: boolean;
}

/**
 * Calculate location offsets for overlapping locations
 * Groups locations within ~1km of each other and applies circular offsets
 */
function calculateLocationOffsets(
  locationsData: Record<string, unknown>
): Map<string, LocationCoordinates> {
  const locations: Array<{ pk: string; lat: number; lon: number }> = [];

  // Extract location coordinates
  for (const [locationPk, locationData] of Object.entries(locationsData)) {
    const location = locationData as Record<string, unknown>;
    const lat = location.lat as number;
    const lon = location.lng as number; // Source uses 'lng'

    if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
      locations.push({ pk: locationPk, lat, lon });
    }
  }

  // Group locations by proximity (0.01° ≈ 1.1km threshold)
  const PROXIMITY_THRESHOLD = 0.01;
  const groups: Array<Array<{ pk: string; lat: number; lon: number }>> = [];
  const processed = new Set<string>();

  for (const loc of locations) {
    if (processed.has(loc.pk)) continue;

    const group = [loc];
    processed.add(loc.pk);

    // Find all locations within threshold
    for (const other of locations) {
      if (processed.has(other.pk)) continue;

      const latDiff = Math.abs(loc.lat - other.lat);
      const lonDiff = Math.abs(loc.lon - other.lon);

      if (latDiff <= PROXIMITY_THRESHOLD && lonDiff <= PROXIMITY_THRESHOLD) {
        group.push(other);
        processed.add(other.pk);
      }
    }

    groups.push(group);
  }

  // Apply offsets to each group
  const offsetMap = new Map<string, LocationCoordinates>();
  const LOCATION_OFFSET_RADIUS = 0.02; // ~2.2km offset radius

  for (const group of groups) {
    if (group.length === 1) {
      // Single location, no offset needed
      const loc = group[0];
      offsetMap.set(loc.pk, {
        location_pk: loc.pk,
        baseLat: loc.lat,
        baseLon: loc.lon,
        offsetLat: loc.lat,
        offsetLon: loc.lon,
        isOffset: false,
      });
    } else {
      // Multiple locations at same coordinates - apply circular offset
      const avgLat = group.reduce((sum, loc) => sum + loc.lat, 0) / group.length;
      const avgLon = group.reduce((sum, loc) => sum + loc.lon, 0) / group.length;

      for (let i = 0; i < group.length; i++) {
        const angle = (i / group.length) * 2 * Math.PI;
        const offsetLat = avgLat + LOCATION_OFFSET_RADIUS * Math.cos(angle);
        const offsetLon = avgLon + LOCATION_OFFSET_RADIUS * Math.sin(angle);

        offsetMap.set(group[i].pk, {
          location_pk: group[i].pk,
          baseLat: group[i].lat,
          baseLon: group[i].lon,
          offsetLat,
          offsetLon,
          isOffset: true,
        });
      }
    }
  }

  return offsetMap;
}

/**
 * ISIS adjacency information
 */
interface IsisAdjacency {
  isisHostname: string;
  neighborSystemId: string;
  adjInterfaceAddress: string;
  metric: number;
}

/**
 * Device location information
 */
interface DeviceLocationInfo {
  deviceCode: string;
  locationPk: string;
  locationName: string;
  locationCode: string;
  lat: number;
  lon: number;
  country: string;
}

/**
 * Device coordinates (potentially offset for multi-device locations)
 */
interface DeviceCoordinates {
  deviceCode: string;
  lat: number;
  lon: number;
  locationName: string;
  locationCode: string;
  country: string;
  isOffset: boolean;
}

/**
 * Build ISIS IP -> adjacency index
 * Maps tunnel IP addresses to ISIS adjacency information
 */
function buildIsisIpIndex(isisData: any): Map<string, IsisAdjacency[]> {
  const ipIndex = new Map<string, IsisAdjacency[]>();

  const isisInstances = isisData?.vrfs?.default?.isisInstances || {};

  for (const [, instance] of Object.entries(isisInstances)) {
    const instanceData = instance as Record<string, Record<string, Record<string, Record<string, unknown>>>>;
    const lsps = instanceData?.level?.['2']?.lsps || {};

    for (const [, lsp] of Object.entries(lsps)) {
      const lspData = lsp as Record<string, unknown>;
      const isisHostname = (lspData?.hostname as Record<string, string>)?.name || 'unknown';
      const neighbors = (lspData?.neighbors as Array<Record<string, unknown>>) || [];

      for (const neighbor of neighbors) {
        const metric = neighbor.metric as number;
        const neighborSystemId = neighbor.systemId as string;
        const adjInterfaceAddresses = neighbor.adjInterfaceAddresses as Array<Record<string, string>>;

        if (adjInterfaceAddresses && Array.isArray(adjInterfaceAddresses) && metric != null) {
          for (const addrObj of adjInterfaceAddresses) {
            const adjInterfaceAddress = addrObj.adjInterfaceAddress;
            if (adjInterfaceAddress) {
              if (!ipIndex.has(adjInterfaceAddress)) {
                ipIndex.set(adjInterfaceAddress, []);
              }
              ipIndex.get(adjInterfaceAddress)!.push({
                isisHostname,
                neighborSystemId,
                adjInterfaceAddress,
                metric,
              });
            }
          }
        }
      }
    }
  }

  return ipIndex;
}

/**
 * Build device code -> location info mapping
 * Uses public device codes from snapshot data and applies location offsets
 */
function buildDeviceLocationMap(
  snapshotData: any,
  locationOffsets: Map<string, LocationCoordinates>
): Map<string, DeviceLocationInfo> {
  const deviceMap = new Map<string, DeviceLocationInfo>();

  const devices = snapshotData?.fetch_data?.dz_serviceability?.devices || {};
  const locations = snapshotData?.fetch_data?.dz_serviceability?.locations || {};

  for (const [, deviceData] of Object.entries(devices)) {
    const device = deviceData as Record<string, unknown>;
    const deviceCode = device.code as string;
    const locationPk = device.location_pk as string | null;

    if (locationPk && locations[locationPk]) {
      const location = locations[locationPk] as Record<string, unknown>;
      const locationOffset = locationOffsets.get(locationPk);

      // Use offset coordinates if available, otherwise use original
      const lat = locationOffset?.offsetLat ?? (location.lat as number);
      const lon = locationOffset?.offsetLon ?? (location.lng as number);

      deviceMap.set(deviceCode, {
        deviceCode,
        locationPk,
        locationName: location.name as string,
        locationCode: location.code as string,
        lat,
        lon,
        country: (location.country as string) || '',
      });
    }
  }

  return deviceMap;
}

/**
 * Calculate device coordinates with offsets for multi-device locations
 * Devices at the same location are arranged in a circle with 0.03° radius (~3.3km)
 */
function calculateDeviceCoordinates(
  deviceLocationMap: Map<string, DeviceLocationInfo>
): Map<string, DeviceCoordinates> {
  // Group devices by location coordinates
  const locationToDevices = new Map<string, string[]>();

  for (const [deviceCode, info] of deviceLocationMap.entries()) {
    const locKey = `${info.lat.toFixed(6)},${info.lon.toFixed(6)}`;
    if (!locationToDevices.has(locKey)) {
      locationToDevices.set(locKey, []);
    }
    locationToDevices.get(locKey)!.push(deviceCode);
  }

  // Calculate coordinates with offsets
  const deviceCoords = new Map<string, DeviceCoordinates>();

  for (const [locKey, deviceCodes] of locationToDevices.entries()) {
    const [latStr, lonStr] = locKey.split(',');
    const baseLat = parseFloat(latStr);
    const baseLon = parseFloat(lonStr);

    const sampleDeviceInfo = deviceLocationMap.get(deviceCodes[0])!;

    if (deviceCodes.length === 1) {
      // Single device, use exact location
      deviceCoords.set(deviceCodes[0], {
        deviceCode: deviceCodes[0],
        lat: baseLat,
        lon: baseLon,
        locationName: sampleDeviceInfo.locationName,
        locationCode: sampleDeviceInfo.locationCode,
        country: sampleDeviceInfo.country,
        isOffset: false,
      });
    } else {
      // Multiple devices, arrange in circle
      const radius = 0.03; // ~3.3km offset

      for (let i = 0; i < deviceCodes.length; i++) {
        const angle = (i / deviceCodes.length) * 2 * Math.PI;
        const offsetLat = baseLat + radius * Math.cos(angle);
        const offsetLon = baseLon + radius * Math.sin(angle);

        const deviceInfo = deviceLocationMap.get(deviceCodes[i])!;
        deviceCoords.set(deviceCodes[i], {
          deviceCode: deviceCodes[i],
          lat: offsetLat,
          lon: offsetLon,
          locationName: deviceInfo.locationName,
          locationCode: deviceInfo.locationCode,
          country: deviceInfo.country,
          isOffset: true,
        });
      }
    }
  }

  return deviceCoords;
}

/**
 * Request body validation schema
 */
const RequestSchema = z.object({
  snapshotKey: z.string().min(1, "snapshotKey is required"),
  isisKey: z.string().min(1, "isisKey is required"),
});

/**
 * Topology API result
 */
interface TopologyResult {
  topology: TopologyLink[];
  locations: Location[];
  summary: TopologyHealthSummary;
  metadata: {
    snapshotKey: string;
    isisKey: string;
    processedAt: string;
  };
}

/**
 * Fetch file content from S3
 */
async function fetchS3File(key: string): Promise<string> {
  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new Error(`Empty response body for key: ${key}`);
    }

    // Convert stream to string
    const chunks: Uint8Array[] = [];
    // AWS SDK v3 Body is an async iterable
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    return buffer.toString("utf-8");
  } catch (error) {
    if (error instanceof Error && "name" in error && error.name === "NoSuchKey") {
      throw new Error(`File not found: ${key}`);
    }
    throw error;
  }
}

/**
 * GET /api/topology
 *
 * Process topology data from local data files (development only)
 */
export async function GET(): Promise<Response> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Load local data files
    const snapshotPath = path.join(process.cwd(), 'data', 'mn-epoch-34-snapshot.json');
    const isisPath = path.join(process.cwd(), 'data', 'isis-db.json');

    const snapshotContent = await fs.readFile(snapshotPath, 'utf-8');
    const isisContent = await fs.readFile(isisPath, 'utf-8');

    // Process data (pure TypeScript)
    const snapshotData = JSON.parse(snapshotContent);
    const isisData = JSON.parse(isisContent);

    // Extract links (object with link_pk as keys)
    const linksObj = snapshotData?.fetch_data?.dz_serviceability?.links || {};
    const locationsObj = snapshotData?.fetch_data?.dz_serviceability?.locations || {};

    // Build indexes using device codes with location offsets
    const locationOffsets = calculateLocationOffsets(locationsObj);
    const isisIpIndex = buildIsisIpIndex(isisData);
    const deviceLocationMap = buildDeviceLocationMap(snapshotData, locationOffsets);
    const deviceCoords = calculateDeviceCoordinates(deviceLocationMap);

    // Extract telemetry samples, index by link_pk
    const telemetrySamples = snapshotData?.fetch_data?.dz_telemetry?.device_latency_samples || [];
    const telemetryByLink = new Map<string, { samples: number[] }>();
    for (const sample of telemetrySamples) {
      if (sample.link_pk && Array.isArray(sample.samples)) {
        telemetryByLink.set(sample.link_pk, { samples: sample.samples });
      }
    }

    // Process each link (three-way comparison)
    const topology: TopologyLink[] = [];
    let healthyCount = 0;
    let driftHighCount = 0;
    let missingTelemetryCount = 0;
    let missingIsisCount = 0;

    for (const [linkPk, linkData] of Object.entries(linksObj)) {
      const link = linkData as Record<string, unknown>;
      const linkCode = link.code as string | null;

      if (!linkCode) {
        console.warn(`Skipping link ${linkPk}: missing link code`);
        continue;
      }

      // Extract device codes from link code (format: "device_a:device_z")
      const [deviceCodeA, deviceCodeZ] = linkCode.split(':');

      if (!deviceCodeA || !deviceCodeZ) {
        console.warn(`Skipping link ${linkPk}: invalid link code format: ${linkCode}`);
        continue;
      }

      // Get device coordinates
      const deviceACords = deviceCoords.get(deviceCodeA);
      const deviceZCoords = deviceCoords.get(deviceCodeZ);

      if (!deviceACords || !deviceZCoords) {
        console.warn(`Skipping link ${linkCode}: missing device coordinates`);
        continue;
      }

      // Expected delay
      const delayNs = link.delay_ns as number;
      const expectedDelayUs = delayNs / 1000;

      // Measured delay (telemetry)
      const telemetry = telemetryByLink.get(linkPk);
      const samples = telemetry?.samples || [];
      const measuredP50 = samples.length > 0 ? median(samples) : null;
      const measuredP90 = samples.length > 0 ? percentile(samples, 90) : null;
      const measuredP95 = samples.length > 0 ? percentile(samples, 95) : null;
      const measuredP99 = samples.length > 0 ? percentile(samples, 99) : null;

      // ISIS metric (match by tunnel IP)
      const tunnelNet = link.tunnel_net as string | null;
      const tunnelIps = parseSlash31Network(tunnelNet);
      let isisMetric: number | null = null;

      for (const ip of tunnelIps) {
        const adjacencies = isisIpIndex.get(ip);
        if (adjacencies && adjacencies.length > 0) {
          isisMetric = adjacencies[0].metric;
          break;
        }
      }

      // Calculate drift
      let driftPct: number | null = null;
      if (measuredP50 != null && expectedDelayUs > 0) {
        driftPct = (Math.abs(measuredP50 - expectedDelayUs) / expectedDelayUs) * 100;
      }

      // Determine data availability
      const hasTelemetry = measuredP50 != null && samples.length > 0;
      const hasIsis = isisMetric != null;

      // Classify data completeness
      const dataStatus = classifyDataCompleteness(hasTelemetry, hasIsis);

      // Determine health status
      let healthStatus: 'HEALTHY' | 'DRIFT_HIGH' | 'MISSING_TELEMETRY' | 'MISSING_ISIS';
      if (measuredP50 == null || samples.length === 0) {
        healthStatus = 'MISSING_TELEMETRY';
        missingTelemetryCount++;
      } else if (isisMetric == null) {
        healthStatus = 'MISSING_ISIS';
        missingIsisCount++;
      } else if (driftPct != null && driftPct >= 10) {
        healthStatus = 'DRIFT_HIGH';
        driftHighCount++;
      } else {
        healthStatus = 'HEALTHY';
        healthyCount++;
      }

      topology.push({
        link_pk: linkPk,
        link_code: linkCode,
        // Device codes (public on-chain data)
        device_a_code: deviceCodeA,
        device_z_code: deviceCodeZ,
        // Device A coordinates and location info
        device_a_lat: deviceACords.lat,
        device_a_lon: deviceACords.lon,
        device_a_location_name: deviceACords.locationName,
        device_a_location_code: deviceACords.locationCode,
        device_a_country: deviceACords.country,
        // Device Z coordinates and location info
        device_z_lat: deviceZCoords.lat,
        device_z_lon: deviceZCoords.lon,
        device_z_location_name: deviceZCoords.locationName,
        device_z_location_code: deviceZCoords.locationCode,
        device_z_country: deviceZCoords.country,
        // Interface names
        side_a_iface_name: link.side_a_iface_name as string,
        side_b_iface_name: link.side_z_iface_name as string,
        // Metrics
        expected_delay_ns: delayNs,
        expected_delay_us: expectedDelayUs,
        measured_p50_us: measuredP50,
        measured_p90_us: measuredP90,
        measured_p95_us: measuredP95,
        measured_p99_us: measuredP99,
        telemetry_sample_count: samples.length,
        isis_metric: isisMetric,
        isis_interface_name: tunnelNet,
        drift_pct: driftPct,
        health_status: healthStatus,
        // Data completeness
        data_status: dataStatus,
        has_serviceability: true,
        has_telemetry: hasTelemetry,
        has_isis: hasIsis,
      });
    }

    // Build enriched location objects with device arrays
    const locationDeviceMap = new Map<string, Set<string>>();

    // Group devices by location (using base coordinates, not offset)
    for (const [deviceCode, deviceInfo] of deviceLocationMap.entries()) {
      const locKey = `${deviceInfo.locationPk}`;
      if (!locationDeviceMap.has(locKey)) {
        locationDeviceMap.set(locKey, new Set());
      }
      locationDeviceMap.get(locKey)!.add(deviceCode);
    }

    // Build location objects with offset coordinates
    const locations: Location[] = [];

    for (const [locationPk, locationData] of Object.entries(locationsObj)) {
      const location = locationData as Record<string, unknown>;
      const devicesAtLocation = Array.from(locationDeviceMap.get(locationPk) || []);
      const locationOffset = locationOffsets.get(locationPk);

      // Use offset coordinates if available, otherwise use original
      const lat = locationOffset?.offsetLat ?? (location.lat as number);
      const lon = locationOffset?.offsetLon ?? (location.lng as number);

      locations.push({
        location_pk: locationPk,
        code: location.code as string,
        name: location.name as string,
        lat,
        lon,
        country: (location.country as string) || undefined,
        device_count: devicesAtLocation.length,
        devices: devicesAtLocation,
        reference_count: devicesAtLocation.length, // For backward compatibility
      });
    }

    const summary: TopologyHealthSummary = {
      total_links: topology.length,
      healthy: healthyCount,
      drift_high: driftHighCount,
      missing_telemetry: missingTelemetryCount,
      missing_isis: missingIsisCount,
    };

    // Build response
    const response: TopologyResult = {
      topology,
      locations,
      summary,
      metadata: {
        snapshotKey: 'local:mn-epoch-34-snapshot.json',
        isisKey: 'local:isis-db.json',
        processedAt: new Date().toISOString(),
      },
    };

    return Response.json({ success: true, data: response });
  } catch (error) {
    console.error("Topology processing error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/topology
 *
 * Process topology data from uploaded files
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validation = RequestSchema.safeParse(body);
    if (!validation.success) {
      const errorMessages = validation.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return Response.json(
        { success: false, error: errorMessages },
        { status: 400 }
      );
    }

    const { snapshotKey, isisKey } = validation.data;

    // Fetch files from S3
    let snapshotContent: string;
    let isisContent: string;

    try {
      snapshotContent = await fetchS3File(snapshotKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return Response.json(
        { success: false, error: `Failed to fetch snapshot file: ${message}` },
        { status: 500 }
      );
    }

    try {
      isisContent = await fetchS3File(isisKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return Response.json(
        { success: false, error: `Failed to fetch ISIS file: ${message}` },
        { status: 500 }
      );
    }

    // Process data (pure TypeScript)
    const snapshotData = JSON.parse(snapshotContent);
    const isisData = JSON.parse(isisContent);

    // Extract links (object with link_pk as keys)
    const linksObj = snapshotData?.fetch_data?.dz_serviceability?.links || {};
    const locationsObj = snapshotData?.fetch_data?.dz_serviceability?.locations || {};

    // Build indexes using device codes with location offsets
    const locationOffsets = calculateLocationOffsets(locationsObj);
    const isisIpIndex = buildIsisIpIndex(isisData);
    const deviceLocationMap = buildDeviceLocationMap(snapshotData, locationOffsets);
    const deviceCoords = calculateDeviceCoordinates(deviceLocationMap);

    // Extract telemetry samples, index by link_pk
    const telemetrySamples = snapshotData?.fetch_data?.dz_telemetry?.device_latency_samples || [];
    const telemetryByLink = new Map<string, { samples: number[] }>();
    for (const sample of telemetrySamples) {
      if (sample.link_pk && Array.isArray(sample.samples)) {
        telemetryByLink.set(sample.link_pk, { samples: sample.samples });
      }
    }

    // Process each link (three-way comparison)
    const topology: TopologyLink[] = [];
    let healthyCount = 0;
    let driftHighCount = 0;
    let missingTelemetryCount = 0;
    let missingIsisCount = 0;

    for (const [linkPk, linkData] of Object.entries(linksObj)) {
      const link = linkData as Record<string, unknown>;
      const linkCode = link.code as string | null;

      if (!linkCode) {
        console.warn(`Skipping link ${linkPk}: missing link code`);
        continue;
      }

      // Extract device codes from link code (format: "device_a:device_z")
      const [deviceCodeA, deviceCodeZ] = linkCode.split(':');

      if (!deviceCodeA || !deviceCodeZ) {
        console.warn(`Skipping link ${linkPk}: invalid link code format: ${linkCode}`);
        continue;
      }

      // Get device coordinates
      const deviceACords = deviceCoords.get(deviceCodeA);
      const deviceZCoords = deviceCoords.get(deviceCodeZ);

      if (!deviceACords || !deviceZCoords) {
        console.warn(`Skipping link ${linkCode}: missing device coordinates`);
        continue;
      }

      // Expected delay
      const delayNs = link.delay_ns as number;
      const expectedDelayUs = delayNs / 1000;

      // Measured delay (telemetry)
      const telemetry = telemetryByLink.get(linkPk);
      const samples = telemetry?.samples || [];
      const measuredP50 = samples.length > 0 ? median(samples) : null;
      const measuredP90 = samples.length > 0 ? percentile(samples, 90) : null;
      const measuredP95 = samples.length > 0 ? percentile(samples, 95) : null;
      const measuredP99 = samples.length > 0 ? percentile(samples, 99) : null;

      // ISIS metric (match by tunnel IP)
      const tunnelNet = link.tunnel_net as string | null;
      const tunnelIps = parseSlash31Network(tunnelNet);
      let isisMetric: number | null = null;

      for (const ip of tunnelIps) {
        const adjacencies = isisIpIndex.get(ip);
        if (adjacencies && adjacencies.length > 0) {
          isisMetric = adjacencies[0].metric;
          break;
        }
      }

      // Calculate drift
      let driftPct: number | null = null;
      if (measuredP50 != null && expectedDelayUs > 0) {
        driftPct = (Math.abs(measuredP50 - expectedDelayUs) / expectedDelayUs) * 100;
      }

      // Determine data availability
      const hasTelemetry = measuredP50 != null && samples.length > 0;
      const hasIsis = isisMetric != null;

      // Classify data completeness
      const dataStatus = classifyDataCompleteness(hasTelemetry, hasIsis);

      // Determine health status
      let healthStatus: 'HEALTHY' | 'DRIFT_HIGH' | 'MISSING_TELEMETRY' | 'MISSING_ISIS';
      if (measuredP50 == null || samples.length === 0) {
        healthStatus = 'MISSING_TELEMETRY';
        missingTelemetryCount++;
      } else if (isisMetric == null) {
        healthStatus = 'MISSING_ISIS';
        missingIsisCount++;
      } else if (driftPct != null && driftPct >= 10) {
        healthStatus = 'DRIFT_HIGH';
        driftHighCount++;
      } else {
        healthStatus = 'HEALTHY';
        healthyCount++;
      }

      topology.push({
        link_pk: linkPk,
        link_code: linkCode,
        // Device codes (public on-chain data)
        device_a_code: deviceCodeA,
        device_z_code: deviceCodeZ,
        // Device A coordinates and location info
        device_a_lat: deviceACords.lat,
        device_a_lon: deviceACords.lon,
        device_a_location_name: deviceACords.locationName,
        device_a_location_code: deviceACords.locationCode,
        device_a_country: deviceACords.country,
        // Device Z coordinates and location info
        device_z_lat: deviceZCoords.lat,
        device_z_lon: deviceZCoords.lon,
        device_z_location_name: deviceZCoords.locationName,
        device_z_location_code: deviceZCoords.locationCode,
        device_z_country: deviceZCoords.country,
        // Interface names
        side_a_iface_name: link.side_a_iface_name as string,
        side_b_iface_name: link.side_z_iface_name as string,
        // Metrics
        expected_delay_ns: delayNs,
        expected_delay_us: expectedDelayUs,
        measured_p50_us: measuredP50,
        measured_p90_us: measuredP90,
        measured_p95_us: measuredP95,
        measured_p99_us: measuredP99,
        telemetry_sample_count: samples.length,
        isis_metric: isisMetric,
        isis_interface_name: tunnelNet,
        drift_pct: driftPct,
        health_status: healthStatus,
        // Data completeness
        data_status: dataStatus,
        has_serviceability: true,
        has_telemetry: hasTelemetry,
        has_isis: hasIsis,
      });
    }

    // Build enriched location objects with device arrays
    const locationDeviceMap = new Map<string, Set<string>>();

    // Group devices by location (using base coordinates, not offset)
    for (const [deviceCode, deviceInfo] of deviceLocationMap.entries()) {
      const locKey = `${deviceInfo.locationPk}`;
      if (!locationDeviceMap.has(locKey)) {
        locationDeviceMap.set(locKey, new Set());
      }
      locationDeviceMap.get(locKey)!.add(deviceCode);
    }

    // Build location objects with offset coordinates
    const locations: Location[] = [];

    for (const [locationPk, locationData] of Object.entries(locationsObj)) {
      const location = locationData as Record<string, unknown>;
      const devicesAtLocation = Array.from(locationDeviceMap.get(locationPk) || []);
      const locationOffset = locationOffsets.get(locationPk);

      // Use offset coordinates if available, otherwise use original
      const lat = locationOffset?.offsetLat ?? (location.lat as number);
      const lon = locationOffset?.offsetLon ?? (location.lng as number);

      locations.push({
        location_pk: locationPk,
        code: location.code as string,
        name: location.name as string,
        lat,
        lon,
        country: (location.country as string) || undefined,
        device_count: devicesAtLocation.length,
        devices: devicesAtLocation,
        reference_count: devicesAtLocation.length, // For backward compatibility
      });
    }

    const summary: TopologyHealthSummary = {
      total_links: topology.length,
      healthy: healthyCount,
      drift_high: driftHighCount,
      missing_telemetry: missingTelemetryCount,
      missing_isis: missingIsisCount,
    };

    // Build response
    const response: TopologyResult = {
      topology,
      locations,
      summary,
      metadata: {
        snapshotKey,
        isisKey,
        processedAt: new Date().toISOString(),
      },
    };

    return Response.json({ success: true, data: response });
  } catch (error) {
    console.error("Topology processing error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
