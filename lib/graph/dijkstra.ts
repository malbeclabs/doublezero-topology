/**
 * Dijkstra's Shortest Path Algorithm
 *
 * Computes shortest path between two nodes in a weighted graph.
 *
 * Time Complexity: O((V + E) log V) where V = vertices, E = edges
 * Space Complexity: O(V)
 */

import { PriorityQueue } from "./priority-queue";
import { findEdge } from "./topology-graph";
import type { TopologyGraph, NetworkPath } from "./types";

/**
 * Compute shortest path using Dijkstra's algorithm
 *
 * Finds the shortest path between source and destination nodes using
 * Dijkstra's algorithm with a min-heap priority queue.
 *
 * @param graph - Weighted topology graph
 * @param sourceId - Source node ID
 * @param destinationId - Destination node ID
 * @returns Shortest path with metrics, or null if no path exists
 *
 * @example
 * ```typescript
 * const graph = buildTopologyGraph(topologyLinks, "latency");
 * const path = dijkstraShortestPath(graph, "device-a", "device-z");
 * if (path) {
 *   console.log(`Path: ${path.hops.map(h => h.name).join(" -> ")}`);
 *   console.log(`Latency: ${path.totalLatencyUs} μs`);
 * }
 * ```
 */
export function dijkstraShortestPath(
  graph: TopologyGraph,
  sourceId: string,
  destinationId: string,
): NetworkPath | null {
  // Validate inputs
  if (!graph.nodes.has(sourceId) || !graph.nodes.has(destinationId)) {
    return null;
  }

  // Special case: source equals destination
  if (sourceId === destinationId) {
    const node = graph.nodes.get(sourceId)!;
    return {
      source: node,
      destination: node,
      hops: [node],
      links: [],
      totalLatencyUs: 0,
      totalHops: 0,
      minBandwidthGbps: undefined,
      pathReliability: 1,
      algorithm: "dijkstra",
    };
  }

  // Initialize distances and previous pointers
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const visited = new Set<string>();

  // Set all distances to Infinity, except source (0)
  for (const nodeId of graph.nodes.keys()) {
    distances.set(nodeId, nodeId === sourceId ? 0 : Infinity);
    previous.set(nodeId, null);
  }

  // Priority queue: (nodeId, distance)
  const pq = new PriorityQueue<string>();
  pq.enqueue(sourceId, 0);

  // Main Dijkstra loop
  while (!pq.isEmpty()) {
    const current = pq.dequeue();
    if (!current) break;

    const currentId = current.value;
    const currentDistance = distances.get(currentId)!;

    // Skip if already visited
    if (visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);

    // Early termination: reached destination
    if (currentId === destinationId) {
      break;
    }

    // Explore neighbors
    const neighbors = graph.adjacencyList.get(currentId) || [];
    for (const neighborId of neighbors) {
      // Skip if already visited
      if (visited.has(neighborId)) {
        continue;
      }

      // Find edge to neighbor
      const edge = findEdge(graph, currentId, neighborId);
      if (!edge) {
        continue;
      }

      // Calculate new distance
      const newDistance = currentDistance + edge.weight;
      const neighborDistance = distances.get(neighborId)!;

      // Update if found shorter path
      if (newDistance < neighborDistance) {
        distances.set(neighborId, newDistance);
        previous.set(neighborId, currentId);
        pq.enqueue(neighborId, newDistance);
      }
    }
  }

  // Reconstruct path
  return reconstructPath(graph, sourceId, destinationId, previous, distances);
}

/**
 * Reconstruct path from Dijkstra's previous pointers
 *
 * @param graph - Topology graph
 * @param sourceId - Source node ID
 * @param destinationId - Destination node ID
 * @param previous - Map of previous pointers
 * @param distances - Map of distances
 * @returns Network path with metrics, or null if no path exists
 */
function reconstructPath(
  graph: TopologyGraph,
  sourceId: string,
  destinationId: string,
  previous: Map<string, string | null>,
  distances: Map<string, number>,
): NetworkPath | null {
  // Check if path exists
  if (distances.get(destinationId) === Infinity) {
    return null; // No path found
  }

  // Build path by following previous pointers
  const pathIds: string[] = [];
  let current: string | null = destinationId;

  while (current !== null) {
    pathIds.unshift(current);
    if (current === sourceId) {
      break;
    }
    current = previous.get(current) ?? null;
  }

  // Verify path is complete
  if (pathIds[0] !== sourceId) {
    return null; // Path reconstruction failed
  }

  // Convert to NetworkPath with metrics
  const hops = pathIds.map((id) => graph.nodes.get(id)!);
  const links = [];
  let totalLatencyUs = 0;
  let minBandwidthGbps: number | undefined = undefined;
  const healthyCounts = { healthy: 0, total: 0 };

  // Process each edge in the path
  for (let i = 0; i < pathIds.length - 1; i++) {
    const edge = findEdge(graph, pathIds[i], pathIds[i + 1]);
    if (edge) {
      links.push(edge);

      // Accumulate latency
      totalLatencyUs += edge.latencyUs;

      // Track minimum bandwidth (bottleneck)
      if (edge.bandwidthGbps !== undefined) {
        if (minBandwidthGbps === undefined) {
          minBandwidthGbps = edge.bandwidthGbps;
        } else {
          minBandwidthGbps = Math.min(minBandwidthGbps, edge.bandwidthGbps);
        }
      }

      // Track health status for reliability
      healthyCounts.total++;
      if (edge.healthStatus === "HEALTHY") {
        healthyCounts.healthy++;
      }
    }
  }

  // Calculate path reliability (percentage of healthy links)
  const pathReliability =
    healthyCounts.total > 0 ? healthyCounts.healthy / healthyCounts.total : 1;

  return {
    source: graph.nodes.get(sourceId)!,
    destination: graph.nodes.get(destinationId)!,
    hops,
    links,
    totalLatencyUs,
    totalHops: links.length,
    minBandwidthGbps,
    pathReliability,
    algorithm: "dijkstra",
  };
}
