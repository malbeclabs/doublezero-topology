/**
 * Graph construction from network topology data
 *
 * Builds weighted graph representation from topology links for shortest path computation.
 */

import type { TopologyLink } from "@/types/topology";
import type {
  GraphNode,
  GraphEdge,
  TopologyGraph,
  WeightingStrategy,
} from "./types";

/**
 * Build topology graph from links
 *
 * Converts array of topology links into weighted graph representation with:
 * - Nodes: Unique devices/locations
 * - Edges: Network links with calculated weights
 * - Adjacency list: Efficient neighbor lookups
 *
 * @param links - Array of topology links
 * @param weightingStrategy - Strategy for calculating edge weights
 * @returns Weighted graph with nodes, edges, and adjacency list
 *
 * @example
 * ```typescript
 * const graph = buildTopologyGraph(topologyLinks, "latency");
 * console.log(`Graph has ${graph.nodes.size} nodes and ${graph.edges.size} edges`);
 * ```
 */
export function buildTopologyGraph(
  links: TopologyLink[],
  weightingStrategy: WeightingStrategy = "latency",
): TopologyGraph {
  const graph: TopologyGraph = {
    nodes: new Map(),
    edges: new Map(),
    adjacencyList: new Map(),
  };

  const active_links = [...links];
  for(let i = active_links.length - 1; i >= 0; i--)
  {
    if( (!active_links[i].has_isis) || (active_links[i].measured_p95_us == 0) || active_links[i].expected_delay_us >= 1000000)
    {
      active_links.splice(i, 1);
    }
  }

  // Early return for empty links
  if (active_links.length === 0) {
    return graph;
  }

  // Build nodes and edges
  for (const link of active_links) {
    // Create/update node for device A
    const nodeAId = link.device_a_code;
    if (!graph.nodes.has(nodeAId)) {
      graph.nodes.set(nodeAId, {
        id: nodeAId,
        type: "device",
        name: link.device_a_code,
        latitude: link.device_a_lat,
        longitude: link.device_a_lon,
        metadata: {
          location_name: link.device_a_location_name,
          location_code: link.device_a_location_code,
          country: link.device_a_country,
        },
      });
    }

    // Create/update node for device Z
    const nodeZId = link.device_z_code;
    if (!graph.nodes.has(nodeZId)) {
      graph.nodes.set(nodeZId, {
        id: nodeZId,
        type: "device",
        name: link.device_z_code,
        latitude: link.device_z_lat,
        longitude: link.device_z_lon,
        metadata: {
          location_name: link.device_z_location_name,
          location_code: link.device_z_location_code,
          country: link.device_z_country,
        },
      });
    }

    // Calculate edge weight based on strategy
    const weight = calculateEdgeWeight(link, weightingStrategy);

    // Determine latency (prefer measured P95, fallback to expected)
    const latencyUs = link.measured_p95_us ?? link.expected_delay_us;

    // Create edge
    const edge: GraphEdge = {
      id: link.link_pk,
      source: nodeAId,
      target: nodeZId,
      weight,
      latencyUs,
      bandwidthGbps: link.bandwidth_gbps ?? undefined,
      healthStatus: link.health_status,
      bidirectional: true,
      metadata: link,
    };

    graph.edges.set(edge.id, edge);

    // Update adjacency list (bidirectional)
    addToAdjacencyList(graph.adjacencyList, nodeAId, nodeZId);
    addToAdjacencyList(graph.adjacencyList, nodeZId, nodeAId);
  }

  return graph;
}

/**
 * Calculate edge weight based on weighting strategy
 *
 * @param link - Topology link
 * @param strategy - Weighting strategy
 * @returns Computed edge weight
 */
function calculateEdgeWeight(
  link: TopologyLink,
  strategy: WeightingStrategy,
): number {
  switch (strategy) {
    case "latency":
      // Prefer measured P95 RTT, fallback to expected delay, then 1000000 (1 second)
      return link.measured_p95_us ?? link.expected_delay_us ?? 1000000;

    case "hops":
      // Uniform weight for hop count minimization
      return 1;

    case "bandwidth":
      // Invert bandwidth so higher bandwidth = lower cost
      // Fallback to 10 Gbps if not available
      const bandwidth = link.bandwidth_gbps ?? 10;
      return 1 / bandwidth;

    case "isis-metric":
      // Use ISIS routing metric, fallback to 10000
      return link.isis_metric ?? 10000;

    case "combined":
      // Weighted combination: 70% latency + 30% bandwidth
      const latency = link.measured_p95_us ?? link.expected_delay_us ?? 1000000;
      const bwCost = 1 / (link.bandwidth_gbps ?? 10);
      // Normalize bandwidth cost to microseconds scale
      return 0.7 * latency + 0.3 * bwCost * 1000000;

    default:
      return 1;
  }
}

/**
 * Add neighbor to adjacency list
 *
 * @param adjacencyList - Adjacency list map
 * @param nodeId - Source node ID
 * @param neighborId - Neighbor node ID
 */
function addToAdjacencyList(
  adjacencyList: Map<string, string[]>,
  nodeId: string,
  neighborId: string,
): void {
  if (!adjacencyList.has(nodeId)) {
    adjacencyList.set(nodeId, []);
  }
  const neighbors = adjacencyList.get(nodeId)!;
  if (!neighbors.includes(neighborId)) {
    neighbors.push(neighborId);
  }
}

/**
 * Find edge between two nodes
 *
 * Helper function to find edge connecting two nodes (in either direction).
 *
 * @param graph - Topology graph
 * @param sourceId - Source node ID
 * @param targetId - Target node ID
 * @returns Edge if found, undefined otherwise
 */
export function findEdge(
  graph: TopologyGraph,
  sourceId: string,
  targetId: string,
): GraphEdge | undefined {
  for (const edge of graph.edges.values()) {
    if (
      (edge.source === sourceId && edge.target === targetId) ||
      (edge.bidirectional &&
        edge.source === targetId &&
        edge.target === sourceId)
    ) {
      return edge;
    }
  }
  return undefined;
}

/**
 * Get all neighbors of a node
 *
 * @param graph - Topology graph
 * @param nodeId - Node ID
 * @returns Array of neighbor node IDs
 */
export function getNeighbors(
  graph: TopologyGraph,
  nodeId: string,
): string[] {
  return graph.adjacencyList.get(nodeId) ?? [];
}

/**
 * Check if graph has node
 *
 * @param graph - Topology graph
 * @param nodeId - Node ID
 * @returns True if node exists
 */
export function hasNode(graph: TopologyGraph, nodeId: string): boolean {
  return graph.nodes.has(nodeId);
}

/**
 * Get node by ID
 *
 * @param graph - Topology graph
 * @param nodeId - Node ID
 * @returns Graph node or undefined
 */
export function getNode(
  graph: TopologyGraph,
  nodeId: string,
): GraphNode | undefined {
  return graph.nodes.get(nodeId);
}
