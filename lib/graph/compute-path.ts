/**
 * Path Computation Helper
 *
 * High-level function to compute shortest path from topology data.
 * Builds graph and runs Dijkstra's algorithm.
 */

import { buildTopologyGraph } from "./topology-graph";
import { dijkstraShortestPath } from "./dijkstra";
import type { TopologyLink } from "@/types/topology";
import type { NetworkPath, WeightingStrategy } from "./types";

export interface ComputePathOptions {
  /** Topology links */
  links: TopologyLink[];

  /** Source node ID (device code) */
  sourceId: string;

  /** Destination node ID (device code) */
  destinationId: string;

  /** Weighting strategy for path computation */
  weightingStrategy?: WeightingStrategy;
}

export interface ComputePathResult {
  /** Computed path, or null if no path exists */
  path: NetworkPath | null;

  /** Error message if computation failed */
  error: string | null;

  /** Computation time in milliseconds */
  computeTimeMs: number;
}

/**
 * Compute shortest path from topology data
 *
 * This is the main entry point for path computation from the UI.
 * It handles graph construction, path computation, and error handling.
 *
 * @param options - Path computation options
 * @returns Result with path, error, and timing information
 *
 * @example
 * ```typescript
 * const result = await computePath({
 *   links: topologyLinks,
 *   sourceId: "device-a",
 *   destinationId: "device-z",
 *   weightingStrategy: "latency"
 * });
 *
 * if (result.path) {
 *   console.log(`Path found: ${result.path.hops.length} hops`);
 *   console.log(`Latency: ${result.path.totalLatencyUs} μs`);
 * } else {
 *   console.error(`Error: ${result.error}`);
 * }
 * ```
 */
export async function computePath(
  options: ComputePathOptions,
): Promise<ComputePathResult> {
  const startTime = performance.now();

  try {
    // Validate inputs
    if (!options.links || options.links.length === 0) {
      return {
        path: null,
        error: "No topology data available",
        computeTimeMs: performance.now() - startTime,
      };
    }

    if (!options.sourceId) {
      return {
        path: null,
        error: "Source device not specified",
        computeTimeMs: performance.now() - startTime,
      };
    }

    if (!options.destinationId) {
      return {
        path: null,
        error: "Destination device not specified",
        computeTimeMs: performance.now() - startTime,
      };
    }

    // Build graph from topology
    const weightingStrategy = options.weightingStrategy || "latency";
    const graph = buildTopologyGraph(options.links, weightingStrategy);

    // Verify nodes exist in graph
    if (!graph.nodes.has(options.sourceId)) {
      return {
        path: null,
        error: `Source device "${options.sourceId}" not found in topology`,
        computeTimeMs: performance.now() - startTime,
      };
    }

    if (!graph.nodes.has(options.destinationId)) {
      return {
        path: null,
        error: `Destination device "${options.destinationId}" not found in topology`,
        computeTimeMs: performance.now() - startTime,
      };
    }

    // Compute shortest path
    const path = dijkstraShortestPath(
      graph,
      options.sourceId,
      options.destinationId,
    );

    // Check if path was found
    if (!path) {
      return {
        path: null,
        error: `No path exists between "${options.sourceId}" and "${options.destinationId}"`,
        computeTimeMs: performance.now() - startTime,
      };
    }

    // Success
    return {
      path,
      error: null,
      computeTimeMs: performance.now() - startTime,
    };
  } catch (error) {
    // Handle unexpected errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return {
      path: null,
      error: `Path computation failed: ${errorMessage}`,
      computeTimeMs: performance.now() - startTime,
    };
  }
}

/**
 * Compute path synchronously (for use in React components)
 *
 * Same as computePath but synchronous for easier use in event handlers.
 *
 * @param options - Path computation options
 * @returns Result with path, error, and timing information
 */
export function computePathSync(
  options: ComputePathOptions,
): ComputePathResult {
  const startTime = performance.now();

  try {
    if (!options.links || options.links.length === 0) {
      return {
        path: null,
        error: "No topology data available",
        computeTimeMs: performance.now() - startTime,
      };
    }

    if (!options.sourceId) {
      return {
        path: null,
        error: "Source device not specified",
        computeTimeMs: performance.now() - startTime,
      };
    }

    if (!options.destinationId) {
      return {
        path: null,
        error: "Destination device not specified",
        computeTimeMs: performance.now() - startTime,
      };
    }

    const weightingStrategy = options.weightingStrategy || "latency";
    const graph = buildTopologyGraph(options.links, weightingStrategy);

    if (!graph.nodes.has(options.sourceId)) {
      return {
        path: null,
        error: `Source device "${options.sourceId}" not found in topology`,
        computeTimeMs: performance.now() - startTime,
      };
    }

    if (!graph.nodes.has(options.destinationId)) {
      return {
        path: null,
        error: `Destination device "${options.destinationId}" not found in topology`,
        computeTimeMs: performance.now() - startTime,
      };
    }

    const path = dijkstraShortestPath(
      graph,
      options.sourceId,
      options.destinationId,
    );

    if (!path) {
      return {
        path: null,
        error: `No path exists between "${options.sourceId}" and "${options.destinationId}"`,
        computeTimeMs: performance.now() - startTime,
      };
    }

    return {
      path,
      error: null,
      computeTimeMs: performance.now() - startTime,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return {
      path: null,
      error: `Path computation failed: ${errorMessage}`,
      computeTimeMs: performance.now() - startTime,
    };
  }
}
