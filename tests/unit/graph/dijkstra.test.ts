/**
 * Dijkstra's Algorithm Tests
 *
 * Tests for shortest path computation using Dijkstra's algorithm.
 */

import { describe, it, expect } from "vitest";
import { dijkstraShortestPath } from "@/lib/graph/dijkstra";
import type { TopologyGraph, GraphNode, GraphEdge } from "@/lib/graph/types";

/**
 * Create a simple test graph
 *
 * Graph structure:
 *   A --10-- B
 *   |        |
 *   5        5
 *   |        |
 *   C --10-- D
 *
 * Shortest paths:
 * A -> D: A -> C -> D (distance: 15)
 * A -> B: A -> B (distance: 10)
 */
function createSimpleGraph(): TopologyGraph {
  const nodes = new Map<string, GraphNode>([
    ["A", { id: "A", type: "device", name: "A", latitude: 0, longitude: 0 }],
    ["B", { id: "B", type: "device", name: "B", latitude: 0, longitude: 1 }],
    ["C", { id: "C", type: "device", name: "C", latitude: 1, longitude: 0 }],
    ["D", { id: "D", type: "device", name: "D", latitude: 1, longitude: 1 }],
  ]);

  const edges = new Map<string, GraphEdge>([
    [
      "A-B",
      {
        id: "A-B",
        source: "A",
        target: "B",
        weight: 10,
        latencyUs: 10,
        healthStatus: "HEALTHY",
        bidirectional: true,
      },
    ],
    [
      "A-C",
      {
        id: "A-C",
        source: "A",
        target: "C",
        weight: 5,
        latencyUs: 5,
        healthStatus: "HEALTHY",
        bidirectional: true,
      },
    ],
    [
      "B-D",
      {
        id: "B-D",
        source: "B",
        target: "D",
        weight: 5,
        latencyUs: 5,
        healthStatus: "HEALTHY",
        bidirectional: true,
      },
    ],
    [
      "C-D",
      {
        id: "C-D",
        source: "C",
        target: "D",
        weight: 10,
        latencyUs: 10,
        healthStatus: "HEALTHY",
        bidirectional: true,
      },
    ],
  ]);

  const adjacencyList = new Map<string, string[]>([
    ["A", ["B", "C"]],
    ["B", ["A", "D"]],
    ["C", ["A", "D"]],
    ["D", ["B", "C"]],
  ]);

  return { nodes, edges, adjacencyList };
}

/**
 * Create linear graph (chain)
 *
 * A --5-- B --10-- C --15-- D
 */
function createLinearGraph(): TopologyGraph {
  const nodes = new Map<string, GraphNode>([
    ["A", { id: "A", type: "device", name: "A", latitude: 0, longitude: 0 }],
    ["B", { id: "B", type: "device", name: "B", latitude: 0, longitude: 1 }],
    ["C", { id: "C", type: "device", name: "C", latitude: 0, longitude: 2 }],
    ["D", { id: "D", type: "device", name: "D", latitude: 0, longitude: 3 }],
  ]);

  const edges = new Map<string, GraphEdge>([
    [
      "A-B",
      {
        id: "A-B",
        source: "A",
        target: "B",
        weight: 5,
        latencyUs: 5,
        healthStatus: "HEALTHY",
        bidirectional: true,
      },
    ],
    [
      "B-C",
      {
        id: "B-C",
        source: "B",
        target: "C",
        weight: 10,
        latencyUs: 10,
        healthStatus: "HEALTHY",
        bidirectional: true,
      },
    ],
    [
      "C-D",
      {
        id: "C-D",
        source: "C",
        target: "D",
        weight: 15,
        latencyUs: 15,
        healthStatus: "HEALTHY",
        bidirectional: true,
      },
    ],
  ]);

  const adjacencyList = new Map<string, string[]>([
    ["A", ["B"]],
    ["B", ["A", "C"]],
    ["C", ["B", "D"]],
    ["D", ["C"]],
  ]);

  return { nodes, edges, adjacencyList };
}

/**
 * Create disconnected graph
 *
 * A --5-- B     C --10-- D
 */
function createDisconnectedGraph(): TopologyGraph {
  const nodes = new Map<string, GraphNode>([
    ["A", { id: "A", type: "device", name: "A", latitude: 0, longitude: 0 }],
    ["B", { id: "B", type: "device", name: "B", latitude: 0, longitude: 1 }],
    ["C", { id: "C", type: "device", name: "C", latitude: 1, longitude: 0 }],
    ["D", { id: "D", type: "device", name: "D", latitude: 1, longitude: 1 }],
  ]);

  const edges = new Map<string, GraphEdge>([
    [
      "A-B",
      {
        id: "A-B",
        source: "A",
        target: "B",
        weight: 5,
        latencyUs: 5,
        healthStatus: "HEALTHY",
        bidirectional: true,
      },
    ],
    [
      "C-D",
      {
        id: "C-D",
        source: "C",
        target: "D",
        weight: 10,
        latencyUs: 10,
        healthStatus: "HEALTHY",
        bidirectional: true,
      },
    ],
  ]);

  const adjacencyList = new Map<string, string[]>([
    ["A", ["B"]],
    ["B", ["A"]],
    ["C", ["D"]],
    ["D", ["C"]],
  ]);

  return { nodes, edges, adjacencyList };
}

describe("dijkstraShortestPath", () => {
  describe("Basic Path Finding", () => {
    it("should find shortest path in connected graph", () => {
      const graph = createSimpleGraph();
      const path = dijkstraShortestPath(graph, "A", "D");

      expect(path).not.toBeNull();
      expect(path!.hops.map((n) => n.id)).toEqual(["A", "C", "D"]);
      expect(path!.totalLatencyUs).toBe(15);
      expect(path!.totalHops).toBe(2);
    });

    it("should find direct path when available", () => {
      const graph = createSimpleGraph();
      const path = dijkstraShortestPath(graph, "A", "B");

      expect(path).not.toBeNull();
      expect(path!.hops.map((n) => n.id)).toEqual(["A", "B"]);
      expect(path!.totalLatencyUs).toBe(10);
      expect(path!.totalHops).toBe(1);
    });

    it("should find path in linear graph", () => {
      const graph = createLinearGraph();
      const path = dijkstraShortestPath(graph, "A", "D");

      expect(path).not.toBeNull();
      expect(path!.hops.map((n) => n.id)).toEqual(["A", "B", "C", "D"]);
      expect(path!.totalLatencyUs).toBe(30); // 5 + 10 + 15
      expect(path!.totalHops).toBe(3);
    });

    it("should handle same source and destination", () => {
      const graph = createSimpleGraph();
      const path = dijkstraShortestPath(graph, "A", "A");

      expect(path).not.toBeNull();
      expect(path!.hops.map((n) => n.id)).toEqual(["A"]);
      expect(path!.totalLatencyUs).toBe(0);
      expect(path!.totalHops).toBe(0);
      expect(path!.links).toEqual([]);
    });
  });

  describe("Disconnected Graphs", () => {
    it("should return null for disconnected nodes", () => {
      const graph = createDisconnectedGraph();
      const path = dijkstraShortestPath(graph, "A", "D");

      expect(path).toBeNull();
    });

    it("should find path within connected component", () => {
      const graph = createDisconnectedGraph();
      const path1 = dijkstraShortestPath(graph, "A", "B");
      const path2 = dijkstraShortestPath(graph, "C", "D");

      expect(path1).not.toBeNull();
      expect(path1!.hops.map((n) => n.id)).toEqual(["A", "B"]);

      expect(path2).not.toBeNull();
      expect(path2!.hops.map((n) => n.id)).toEqual(["C", "D"]);
    });
  });

  describe("Path Metrics", () => {
    it("should calculate total latency correctly", () => {
      const graph = createLinearGraph();
      const path = dijkstraShortestPath(graph, "A", "D");

      expect(path).not.toBeNull();
      expect(path!.totalLatencyUs).toBe(30); // Sum of latencies
    });

    it("should calculate hop count correctly", () => {
      const graph = createSimpleGraph();
      const path = dijkstraShortestPath(graph, "A", "D");

      expect(path).not.toBeNull();
      expect(path!.totalHops).toBe(2); // A -> C -> D
      expect(path!.links.length).toBe(2);
    });

    it("should calculate minimum bandwidth along path", () => {
      const graph = createSimpleGraph();
      // Add bandwidth to edges
      graph.edges.get("A-C")!.bandwidthGbps = 100;
      graph.edges.get("C-D")!.bandwidthGbps = 50;

      const path = dijkstraShortestPath(graph, "A", "D");

      expect(path).not.toBeNull();
      expect(path!.minBandwidthGbps).toBe(50); // Bottleneck
    });

    it("should handle undefined bandwidth", () => {
      const graph = createSimpleGraph();
      const path = dijkstraShortestPath(graph, "A", "D");

      expect(path).not.toBeNull();
      expect(path!.minBandwidthGbps).toBeUndefined();
    });

    it("should calculate path reliability based on health status", () => {
      const graph = createSimpleGraph();
      // Set health status for edges
      graph.edges.get("A-C")!.healthStatus = "HEALTHY";
      graph.edges.get("C-D")!.healthStatus = "DRIFT_HIGH";

      const path = dijkstraShortestPath(graph, "A", "D");

      expect(path).not.toBeNull();
      expect(path!.pathReliability).toBe(0.5); // 1 healthy out of 2 links
    });

    it("should have perfect reliability for all healthy links", () => {
      const graph = createSimpleGraph();
      const path = dijkstraShortestPath(graph, "A", "D");

      expect(path).not.toBeNull();
      expect(path!.pathReliability).toBe(1); // All links HEALTHY
    });
  });

  describe("Algorithm Properties", () => {
    it("should set algorithm to 'dijkstra'", () => {
      const graph = createSimpleGraph();
      const path = dijkstraShortestPath(graph, "A", "D");

      expect(path).not.toBeNull();
      expect(path!.algorithm).toBe("dijkstra");
    });

    it("should populate source and destination nodes", () => {
      const graph = createSimpleGraph();
      const path = dijkstraShortestPath(graph, "A", "D");

      expect(path).not.toBeNull();
      expect(path!.source.id).toBe("A");
      expect(path!.destination.id).toBe("D");
    });

    it("should include all intermediate hops", () => {
      const graph = createLinearGraph();
      const path = dijkstraShortestPath(graph, "A", "D");

      expect(path).not.toBeNull();
      expect(path!.hops).toHaveLength(4); // A, B, C, D
      expect(path!.links).toHaveLength(3); // A-B, B-C, C-D
    });
  });

  describe("Edge Cases", () => {
    it("should handle invalid source node", () => {
      const graph = createSimpleGraph();
      const path = dijkstraShortestPath(graph, "INVALID", "D");

      expect(path).toBeNull();
    });

    it("should handle invalid destination node", () => {
      const graph = createSimpleGraph();
      const path = dijkstraShortestPath(graph, "A", "INVALID");

      expect(path).toBeNull();
    });

    it("should handle empty graph", () => {
      const emptyGraph: TopologyGraph = {
        nodes: new Map(),
        edges: new Map(),
        adjacencyList: new Map(),
      };

      const path = dijkstraShortestPath(emptyGraph, "A", "B");
      expect(path).toBeNull();
    });

    it("should handle single node graph", () => {
      const singleNodeGraph: TopologyGraph = {
        nodes: new Map([
          ["A", { id: "A", type: "device", name: "A", latitude: 0, longitude: 0 }],
        ]),
        edges: new Map(),
        adjacencyList: new Map([["A", []]]),
      };

      const path = dijkstraShortestPath(singleNodeGraph, "A", "A");
      expect(path).not.toBeNull();
      expect(path!.hops).toEqual([singleNodeGraph.nodes.get("A")]);
      expect(path!.totalLatencyUs).toBe(0);
    });
  });

  describe("Performance", () => {
    it("should compute path quickly for moderate-sized graph", () => {
      // Create graph with 50 nodes in a grid
      const graph: TopologyGraph = {
        nodes: new Map(),
        edges: new Map(),
        adjacencyList: new Map(),
      };

      // Create 50 nodes
      for (let i = 0; i < 50; i++) {
        graph.nodes.set(`node-${i}`, {
          id: `node-${i}`,
          type: "device",
          name: `node-${i}`,
          latitude: i,
          longitude: i,
        });
        graph.adjacencyList.set(`node-${i}`, []);
      }

      // Create edges (chain + some cross-connections)
      for (let i = 0; i < 49; i++) {
        const edgeId = `edge-${i}`;
        graph.edges.set(edgeId, {
          id: edgeId,
          source: `node-${i}`,
          target: `node-${i + 1}`,
          weight: Math.random() * 10 + 1,
          latencyUs: Math.random() * 1000,
          healthStatus: "HEALTHY",
          bidirectional: true,
        });
        graph.adjacencyList.get(`node-${i}`)!.push(`node-${i + 1}`);
        graph.adjacencyList.get(`node-${i + 1}`)!.push(`node-${i}`);
      }

      const startTime = performance.now();
      const path = dijkstraShortestPath(graph, "node-0", "node-49");
      const duration = performance.now() - startTime;

      expect(path).not.toBeNull();
      expect(duration).toBeLessThan(50); // Should be very fast
    });

    it("should handle dense graph efficiently", () => {
      // Create fully connected graph with 20 nodes
      const graph: TopologyGraph = {
        nodes: new Map(),
        edges: new Map(),
        adjacencyList: new Map(),
      };

      const n = 20;
      for (let i = 0; i < n; i++) {
        graph.nodes.set(`node-${i}`, {
          id: `node-${i}`,
          type: "device",
          name: `node-${i}`,
          latitude: i,
          longitude: i,
        });
        graph.adjacencyList.set(`node-${i}`, []);
      }

      // Connect every node to every other node
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const edgeId = `edge-${i}-${j}`;
          graph.edges.set(edgeId, {
            id: edgeId,
            source: `node-${i}`,
            target: `node-${j}`,
            weight: Math.random() * 10 + 1,
            latencyUs: Math.random() * 1000,
            healthStatus: "HEALTHY",
            bidirectional: true,
          });
          graph.adjacencyList.get(`node-${i}`)!.push(`node-${j}`);
          graph.adjacencyList.get(`node-${j}`)!.push(`node-${i}`);
        }
      }

      const startTime = performance.now();
      const path = dijkstraShortestPath(graph, "node-0", "node-19");
      const duration = performance.now() - startTime;

      expect(path).not.toBeNull();
      expect(duration).toBeLessThan(100); // Should still be fast
    });
  });
});
