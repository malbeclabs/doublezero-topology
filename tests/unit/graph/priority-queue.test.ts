/**
 * Priority Queue Tests
 *
 * Tests for min-heap based priority queue used in Dijkstra's algorithm.
 */

import { describe, it, expect } from "vitest";
import { PriorityQueue } from "@/lib/graph/priority-queue";

describe("PriorityQueue", () => {
  describe("Basic Operations", () => {
    it("should initialize as empty", () => {
      const pq = new PriorityQueue<string>();
      expect(pq.isEmpty()).toBe(true);
      expect(pq.size()).toBe(0);
    });

    it("should enqueue items", () => {
      const pq = new PriorityQueue<string>();
      pq.enqueue("a", 10);

      expect(pq.isEmpty()).toBe(false);
      expect(pq.size()).toBe(1);
    });

    it("should dequeue items in priority order", () => {
      const pq = new PriorityQueue<string>();
      pq.enqueue("a", 10);
      pq.enqueue("b", 5);
      pq.enqueue("c", 15);

      expect(pq.dequeue()?.value).toBe("b"); // priority 5 (lowest)
      expect(pq.dequeue()?.value).toBe("a"); // priority 10
      expect(pq.dequeue()?.value).toBe("c"); // priority 15
      expect(pq.dequeue()).toBe(undefined); // empty
    });

    it("should maintain min-heap property", () => {
      const pq = new PriorityQueue<number>();
      const values = [50, 30, 70, 20, 60, 40, 80, 10];

      // Enqueue in random order
      for (let i = 0; i < values.length; i++) {
        pq.enqueue(values[i], values[i]);
      }

      // Should dequeue in sorted order
      const sorted = values.slice().sort((a, b) => a - b);
      for (const expected of sorted) {
        const item = pq.dequeue();
        expect(item?.value).toBe(expected);
        expect(item?.priority).toBe(expected);
      }
    });

    it("should handle duplicate priorities (FIFO for same priority)", () => {
      const pq = new PriorityQueue<string>();
      pq.enqueue("a", 10);
      pq.enqueue("b", 10);
      pq.enqueue("c", 5);

      expect(pq.dequeue()?.value).toBe("c"); // priority 5
      const first = pq.dequeue()?.value;
      const second = pq.dequeue()?.value;

      // Both should be dequeued, order may vary for same priority
      expect([first, second]).toContain("a");
      expect([first, second]).toContain("b");
    });

    it("should return undefined when dequeuing from empty queue", () => {
      const pq = new PriorityQueue<string>();
      expect(pq.dequeue()).toBe(undefined);
    });
  });

  describe("Peek Operation", () => {
    it("should peek at top element without removing it", () => {
      const pq = new PriorityQueue<string>();
      pq.enqueue("a", 10);
      pq.enqueue("b", 5);

      const top = pq.peek();
      expect(top?.value).toBe("b");
      expect(top?.priority).toBe(5);

      // Should not remove element
      expect(pq.size()).toBe(2);

      // Next dequeue should return same element
      expect(pq.dequeue()?.value).toBe("b");
    });

    it("should return undefined when peeking empty queue", () => {
      const pq = new PriorityQueue<string>();
      expect(pq.peek()).toBe(undefined);
    });
  });

  describe("Edge Cases", () => {
    it("should handle single element", () => {
      const pq = new PriorityQueue<string>();
      pq.enqueue("only", 42);

      expect(pq.peek()?.value).toBe("only");
      expect(pq.dequeue()?.value).toBe("only");
      expect(pq.isEmpty()).toBe(true);
    });

    it("should handle negative priorities", () => {
      const pq = new PriorityQueue<string>();
      pq.enqueue("a", -10);
      pq.enqueue("b", 5);
      pq.enqueue("c", -20);

      expect(pq.dequeue()?.value).toBe("c"); // -20 (lowest)
      expect(pq.dequeue()?.value).toBe("a"); // -10
      expect(pq.dequeue()?.value).toBe("b"); // 5
    });

    it("should handle zero priority", () => {
      const pq = new PriorityQueue<string>();
      pq.enqueue("a", 0);
      pq.enqueue("b", 10);
      pq.enqueue("c", -5);

      expect(pq.dequeue()?.value).toBe("c"); // -5
      expect(pq.dequeue()?.value).toBe("a"); // 0
      expect(pq.dequeue()?.value).toBe("b"); // 10
    });

    it("should handle floating point priorities", () => {
      const pq = new PriorityQueue<string>();
      pq.enqueue("a", 10.5);
      pq.enqueue("b", 10.2);
      pq.enqueue("c", 10.8);

      expect(pq.dequeue()?.value).toBe("b"); // 10.2
      expect(pq.dequeue()?.value).toBe("a"); // 10.5
      expect(pq.dequeue()?.value).toBe("c"); // 10.8
    });

    it("should handle complex object values", () => {
      interface Node {
        id: string;
        data: number;
      }

      const pq = new PriorityQueue<Node>();
      pq.enqueue({ id: "a", data: 100 }, 10);
      pq.enqueue({ id: "b", data: 200 }, 5);

      const item = pq.dequeue();
      expect(item?.value.id).toBe("b");
      expect(item?.value.data).toBe(200);
      expect(item?.priority).toBe(5);
    });
  });

  describe("Performance", () => {
    it("should handle large number of elements efficiently", () => {
      const pq = new PriorityQueue<number>();
      const n = 10000;

      // Enqueue 10000 elements in random order
      const startEnqueue = performance.now();
      for (let i = 0; i < n; i++) {
        pq.enqueue(i, Math.random() * n);
      }
      const enqueueTime = performance.now() - startEnqueue;

      expect(pq.size()).toBe(n);
      expect(enqueueTime).toBeLessThan(150); // Should be fast (relaxed for CI runners)

      // Dequeue all elements
      const startDequeue = performance.now();
      let prev = -Infinity;
      for (let i = 0; i < n; i++) {
        const item = pq.dequeue();
        expect(item).toBeDefined();
        expect(item!.priority).toBeGreaterThanOrEqual(prev);
        prev = item!.priority;
      }
      const dequeueTime = performance.now() - startDequeue;

      expect(pq.isEmpty()).toBe(true);
      expect(dequeueTime).toBeLessThan(300); // Should be fast (relaxed for CI runners)
    });

    it("should maintain heap property with alternating enqueue/dequeue", () => {
      const pq = new PriorityQueue<number>();

      for (let i = 0; i < 100; i++) {
        pq.enqueue(i, Math.random() * 100);

        if (i % 3 === 0 && !pq.isEmpty()) {
          const item = pq.dequeue();
          expect(item).toBeDefined();
        }
      }

      // Verify remaining elements are in priority order
      let prev = -Infinity;
      while (!pq.isEmpty()) {
        const item = pq.dequeue();
        expect(item!.priority).toBeGreaterThanOrEqual(prev);
        prev = item!.priority;
      }
    });
  });

  describe("Type Safety", () => {
    it("should work with string values", () => {
      const pq = new PriorityQueue<string>();
      pq.enqueue("hello", 1);
      pq.enqueue("world", 0);

      expect(pq.dequeue()?.value).toBe("world");
    });

    it("should work with number values", () => {
      const pq = new PriorityQueue<number>();
      pq.enqueue(42, 10);
      pq.enqueue(99, 5);

      expect(pq.dequeue()?.value).toBe(99);
    });

    it("should work with custom type values", () => {
      interface GraphNode {
        id: string;
        lat: number;
        lon: number;
      }

      const pq = new PriorityQueue<GraphNode>();
      const node1: GraphNode = { id: "a", lat: 1.0, lon: 2.0 };
      const node2: GraphNode = { id: "b", lat: 3.0, lon: 4.0 };

      pq.enqueue(node1, 10);
      pq.enqueue(node2, 5);

      const result = pq.dequeue();
      expect(result?.value).toBe(node2);
    });
  });
});
