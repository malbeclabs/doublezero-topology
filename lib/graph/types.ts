/**
 * Graph data structures for network topology representation and shortest path computation.
 *
 * These types define the graph representation used for routing analysis, including:
 * - Nodes (devices/locations)
 * - Edges (network links)
 * - Weighted graphs with adjacency lists
 * - Computed network paths
 */

/**
 * Node in the network graph
 *
 * Represents a device or location in the network topology.
 */
export interface GraphNode {
  /** Unique identifier (device PK or location PK) */
  id: string;

  /** Node type */
  type: "device" | "location";

  /** Display name (device code or location name) */
  name: string;

  /** Geographic latitude */
  latitude: number;

  /** Geographic longitude */
  longitude: number;

  /** Additional metadata (full device/location object) */
  metadata?: unknown;
}

/**
 * Edge in the network graph
 *
 * Represents a network link between two devices.
 */
export interface GraphEdge {
  /** Unique identifier (link PK) */
  id: string;

  /** Source node ID */
  source: string;

  /** Target node ID */
  target: string;

  /** Computed weight for path calculation */
  weight: number;

  /** Actual latency in microseconds */
  latencyUs: number;

  /** Link bandwidth in Gbps (optional) */
  bandwidthGbps?: number;

  /** Health status of the link */
  healthStatus: string;

  /** Whether the link is bidirectional */
  bidirectional: boolean;

  /** Additional metadata (full link object) */
  metadata?: unknown;
}

/**
 * Weighted graph representation of network topology
 *
 * Uses adjacency list for efficient neighbor lookups during path computation.
 */
export interface TopologyGraph {
  /** Map of node ID to GraphNode */
  nodes: Map<string, GraphNode>;

  /** Map of edge ID to GraphEdge */
  edges: Map<string, GraphEdge>;

  /** Adjacency list: node ID -> array of neighbor node IDs */
  adjacencyList: Map<string, string[]>;
}

/**
 * Computed network path between source and destination
 *
 * Contains ordered sequence of hops and links, along with aggregated metrics.
 */
export interface NetworkPath {
  /** Source node */
  source: GraphNode;

  /** Destination node */
  destination: GraphNode;

  /** Ordered list of nodes along the path (including source and destination) */
  hops: GraphNode[];

  /** Ordered list of edges along the path */
  links: GraphEdge[];

  /** Total latency along the path in microseconds */
  totalLatencyUs: number;

  /** Total number of hops (links traversed) */
  totalHops: number;

  /** Minimum bandwidth along the path in Gbps (bottleneck) */
  minBandwidthGbps?: number;

  /** Path reliability score (0-1, based on link health) */
  pathReliability: number;

  /** Algorithm used to compute the path */
  algorithm: "dijkstra" | "k-shortest" | "all-paths";
}

/**
 * Weighting strategy for edge weight calculation
 *
 * Determines how edge weights are computed for shortest path algorithms.
 */
export type WeightingStrategy =
  | "latency" // Minimize total latency (use measured P95 RTT)
  | "hops" // Minimize hop count (uniform weight)
  | "bandwidth" // Maximize bandwidth (invert bandwidth for weight)
  | "isis-metric" // Use ISIS metrics from routing protocol
  | "combined"; // Weighted combination (70% latency + 30% bandwidth)

/**
 * Priority queue item for Dijkstra's algorithm
 */
export interface PriorityQueueItem<T> {
  /** Value stored in the queue */
  value: T;

  /** Priority (lower values have higher priority) */
  priority: number;
}
