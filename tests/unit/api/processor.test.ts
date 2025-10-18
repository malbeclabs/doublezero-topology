/**
 * Topology Processor Unit Tests
 *
 * Tests the core topology processing logic that performs three-way
 * comparison between Serviceability, Telemetry, and IS-IS data.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { processTopologyData } from '@/app/api/topology/processor';

describe('processTopologyData', () => {
  it('should process minimal valid snapshot and ISIS data', async () => {
    const snapshotData = {
      fetch_data: {
        dz_serviceability: {
          links: {
            'link-1': {
              code: 'device-a:device-b',
              delay_ns: 10000000, // 10ms
              tunnel_net: '172.16.0.0/31',
              side_a_iface_name: 'eth0',
              side_z_iface_name: 'eth1',
              side_a_device_pk: 'dev-a',
              side_z_device_pk: 'dev-b',
            },
          },
          devices: {
            'dev-a': {
              code: 'device-a',
              location_pk: 'loc-1',
            },
            'dev-b': {
              code: 'device-b',
              location_pk: 'loc-2',
            },
          },
          locations: {
            'loc-1': {
              code: 'NYC',
              name: 'New York',
              lat: 40.7128,
              lng: -74.0060,
              country: 'US',
            },
            'loc-2': {
              code: 'LAX',
              name: 'Los Angeles',
              lat: 34.0522,
              lng: -118.2437,
              country: 'US',
            },
          },
        },
        dz_telemetry: {
          device_latency_samples: [
            {
              link_pk: 'link-1',
              samples: [10000, 10100, 9900, 10050], // ~10ms (10,000 µs)
            },
          ],
        },
      },
    };

    const isisData = {
      vrfs: {
        default: {
          isisInstances: {
            '1': {
              level: {
                '2': {
                  lsps: {
                    'lsp-1': {
                      hostname: { name: 'device-a' },
                      neighbors: [
                        {
                          systemId: 'device-b',
                          metric: 10000, // 10ms
                          adjInterfaceAddresses: [
                            { adjInterfaceAddress: '172.16.0.0' },
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = await processTopologyData(snapshotData, isisData);

    // Verify structure
    expect(result).toHaveProperty('topology');
    expect(result).toHaveProperty('locations');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('processedAt');

    // Verify topology data
    expect(result.topology).toHaveLength(1);
    const link = result.topology[0];

    expect(link.link_code).toBe('device-a:device-b');
    expect(link.device_a_code).toBe('device-a');
    expect(link.device_z_code).toBe('device-b');
    expect(link.expected_delay_us).toBe(10000);
    // Samples: [10000, 10100, 9900, 10050] -> sorted: [9900, 10000, 10050, 10100]
    // Median: (10000 + 10050) / 2 = 10025
    expect(link.measured_p50_us).toBe(10025);
    expect(link.isis_metric).toBe(10000);
    expect(link.health_status).toBe('HEALTHY');
    expect(link.data_status).toBe('COMPLETE');

    // Verify summary
    expect(result.summary.total_links).toBe(1);
    expect(result.summary.healthy).toBe(1);
    expect(result.summary.drift_high).toBe(0);
    expect(result.summary.missing_telemetry).toBe(0);
    expect(result.summary.missing_isis).toBe(0);

    // Verify locations
    expect(result.locations).toHaveLength(2);
    const nycLocation = result.locations.find((loc) => loc.code === 'NYC');
    expect(nycLocation).toBeDefined();
    expect(nycLocation?.device_count).toBe(1);
    expect(nycLocation?.devices).toContain('device-a');
  });

  it('should detect drift when telemetry differs from expected delay', async () => {
    const snapshotData = {
      fetch_data: {
        dz_serviceability: {
          links: {
            'link-1': {
              code: 'device-a:device-b',
              delay_ns: 10000000, // 10ms (10,000 µs)
              tunnel_net: '172.16.0.0/31',
              side_a_iface_name: 'eth0',
              side_z_iface_name: 'eth1',
              side_a_device_pk: 'dev-a',
              side_z_device_pk: 'dev-b',
            },
          },
          devices: {
            'dev-a': { code: 'device-a', location_pk: 'loc-1' },
            'dev-b': { code: 'device-b', location_pk: 'loc-1' },
          },
          locations: {
            'loc-1': {
              code: 'NYC',
              name: 'New York',
              lat: 40.7128,
              lng: -74.0060,
              country: 'US',
            },
          },
        },
        dz_telemetry: {
          device_latency_samples: [
            {
              link_pk: 'link-1',
              // 20ms samples - 100% drift from expected 10ms
              samples: [20000, 20100, 19900, 20050],
            },
          ],
        },
      },
    };

    const isisData = {
      vrfs: {
        default: {
          isisInstances: {
            '1': {
              level: {
                '2': {
                  lsps: {
                    'lsp-1': {
                      hostname: { name: 'device-a' },
                      neighbors: [
                        {
                          systemId: 'device-b',
                          metric: 10000,
                          adjInterfaceAddresses: [
                            { adjInterfaceAddress: '172.16.0.0' },
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = await processTopologyData(snapshotData, isisData);

    expect(result.topology).toHaveLength(1);
    const link = result.topology[0];

    expect(link.health_status).toBe('DRIFT_HIGH');
    expect(link.drift_pct).toBeGreaterThan(90); // ~100% drift
    expect(result.summary.drift_high).toBe(1);
    expect(result.summary.healthy).toBe(0);
  });

  it('should handle missing telemetry data', async () => {
    const snapshotData = {
      fetch_data: {
        dz_serviceability: {
          links: {
            'link-1': {
              code: 'device-a:device-b',
              delay_ns: 10000000,
              tunnel_net: '172.16.0.0/31',
              side_a_iface_name: 'eth0',
              side_z_iface_name: 'eth1',
              side_a_device_pk: 'dev-a',
              side_z_device_pk: 'dev-b',
            },
          },
          devices: {
            'dev-a': { code: 'device-a', location_pk: 'loc-1' },
            'dev-b': { code: 'device-b', location_pk: 'loc-1' },
          },
          locations: {
            'loc-1': {
              code: 'NYC',
              name: 'New York',
              lat: 40.7128,
              lng: -74.0060,
              country: 'US',
            },
          },
        },
        dz_telemetry: {
          device_latency_samples: [], // No telemetry data
        },
      },
    };

    const isisData = {
      vrfs: {
        default: {
          isisInstances: {
            '1': {
              level: {
                '2': {
                  lsps: {
                    'lsp-1': {
                      hostname: { name: 'device-a' },
                      neighbors: [
                        {
                          systemId: 'device-b',
                          metric: 10000,
                          adjInterfaceAddresses: [
                            { adjInterfaceAddress: '172.16.0.0' },
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = await processTopologyData(snapshotData, isisData);

    expect(result.topology).toHaveLength(1);
    const link = result.topology[0];

    expect(link.health_status).toBe('MISSING_TELEMETRY');
    expect(link.measured_p50_us).toBeNull();
    expect(link.has_telemetry).toBe(false);
    expect(result.summary.missing_telemetry).toBe(1);
  });

  it('should handle missing ISIS data', async () => {
    const snapshotData = {
      fetch_data: {
        dz_serviceability: {
          links: {
            'link-1': {
              code: 'device-a:device-b',
              delay_ns: 10000000,
              tunnel_net: '172.16.0.0/31',
              side_a_iface_name: 'eth0',
              side_z_iface_name: 'eth1',
              side_a_device_pk: 'dev-a',
              side_z_device_pk: 'dev-b',
            },
          },
          devices: {
            'dev-a': { code: 'device-a', location_pk: 'loc-1' },
            'dev-b': { code: 'device-b', location_pk: 'loc-1' },
          },
          locations: {
            'loc-1': {
              code: 'NYC',
              name: 'New York',
              lat: 40.7128,
              lng: -74.0060,
              country: 'US',
            },
          },
        },
        dz_telemetry: {
          device_latency_samples: [
            {
              link_pk: 'link-1',
              samples: [10000, 10100, 9900, 10050],
            },
          ],
        },
      },
    };

    const isisData = {
      vrfs: {
        default: {
          isisInstances: {
            '1': {
              level: {
                '2': {
                  lsps: {}, // No ISIS data
                },
              },
            },
          },
        },
      },
    };

    const result = await processTopologyData(snapshotData, isisData);

    expect(result.topology).toHaveLength(1);
    const link = result.topology[0];

    expect(link.health_status).toBe('MISSING_ISIS');
    expect(link.isis_metric).toBeNull();
    expect(link.has_isis).toBe(false);
    expect(result.summary.missing_isis).toBe(1);
  });

  it('should match ISIS data using /31 tunnel network IPs', async () => {
    const snapshotData = {
      fetch_data: {
        dz_serviceability: {
          links: {
            'link-1': {
              code: 'device-a:device-b',
              delay_ns: 10000000,
              tunnel_net: '172.16.0.100/31', // IPs: .100 and .101
              side_a_iface_name: 'eth0',
              side_z_iface_name: 'eth1',
              side_a_device_pk: 'dev-a',
              side_z_device_pk: 'dev-b',
            },
          },
          devices: {
            'dev-a': { code: 'device-a', location_pk: 'loc-1' },
            'dev-b': { code: 'device-b', location_pk: 'loc-1' },
          },
          locations: {
            'loc-1': {
              code: 'NYC',
              name: 'New York',
              lat: 40.7128,
              lng: -74.0060,
              country: 'US',
            },
          },
        },
        dz_telemetry: {
          device_latency_samples: [
            {
              link_pk: 'link-1',
              samples: [10000],
            },
          ],
        },
      },
    };

    const isisData = {
      vrfs: {
        default: {
          isisInstances: {
            '1': {
              level: {
                '2': {
                  lsps: {
                    'lsp-1': {
                      hostname: { name: 'device-a' },
                      neighbors: [
                        {
                          systemId: 'device-b',
                          metric: 10000,
                          // Match using second IP in /31 network
                          adjInterfaceAddresses: [
                            { adjInterfaceAddress: '172.16.0.101' },
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = await processTopologyData(snapshotData, isisData);

    expect(result.topology).toHaveLength(1);
    const link = result.topology[0];

    // Should match using the .101 IP
    expect(link.isis_metric).toBe(10000);
    expect(link.has_isis).toBe(true);
  });

  it('should calculate percentiles correctly', async () => {
    const snapshotData = {
      fetch_data: {
        dz_serviceability: {
          links: {
            'link-1': {
              code: 'device-a:device-b',
              delay_ns: 10000000,
              tunnel_net: '172.16.0.0/31',
              side_a_iface_name: 'eth0',
              side_z_iface_name: 'eth1',
              side_a_device_pk: 'dev-a',
              side_z_device_pk: 'dev-b',
            },
          },
          devices: {
            'dev-a': { code: 'device-a', location_pk: 'loc-1' },
            'dev-b': { code: 'device-b', location_pk: 'loc-1' },
          },
          locations: {
            'loc-1': {
              code: 'NYC',
              name: 'New York',
              lat: 40.7128,
              lng: -74.0060,
              country: 'US',
            },
          },
        },
        dz_telemetry: {
          device_latency_samples: [
            {
              link_pk: 'link-1',
              // 100 samples from 1000 to 2000
              samples: Array.from({ length: 100 }, (_, i) => 1000 + i * 10),
            },
          ],
        },
      },
    };

    const isisData = {
      vrfs: {
        default: {
          isisInstances: {
            '1': {
              level: {
                '2': {
                  lsps: {},
                },
              },
            },
          },
        },
      },
    };

    const result = await processTopologyData(snapshotData, isisData);

    const link = result.topology[0];

    // Verify percentile calculations
    // 100 samples: [1000, 1010, 1020, ..., 1990]
    expect(link.measured_p50_us).toBeCloseTo(1495, 0.1); // median
    expect(link.measured_p90_us).toBeCloseTo(1891, 0.1); // 90th percentile
    expect(link.measured_p95_us).toBeCloseTo(1940.5, 0.1); // 95th percentile
    expect(link.measured_p99_us).toBeCloseTo(1980.1, 1); // 99th percentile
  });

  it('should handle empty links gracefully', async () => {
    const snapshotData = {
      fetch_data: {
        dz_serviceability: {
          links: {}, // No links
          devices: {},
          locations: {},
        },
        dz_telemetry: {
          device_latency_samples: [],
        },
      },
    };

    const isisData = {
      vrfs: {
        default: {
          isisInstances: {
            '1': {
              level: {
                '2': {
                  lsps: {},
                },
              },
            },
          },
        },
      },
    };

    const result = await processTopologyData(snapshotData, isisData);

    expect(result.topology).toHaveLength(0);
    expect(result.locations).toHaveLength(0);
    expect(result.summary.total_links).toBe(0);
    expect(result.summary.healthy).toBe(0);
  });
});
