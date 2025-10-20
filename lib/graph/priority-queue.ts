/**
 * Priority Queue (Min-Heap)
 *
 * Efficient min-heap based priority queue for Dijkstra's shortest path algorithm.
 * Lower priority values are dequeued first.
 *
 * Time Complexity:
 * - enqueue: O(log n)
 * - dequeue: O(log n)
 * - peek: O(1)
 * - isEmpty: O(1)
 * - size: O(1)
 */

import type { PriorityQueueItem } from "./types";

export class PriorityQueue<T> {
  private heap: PriorityQueueItem<T>[] = [];

  /**
   * Add item to the priority queue
   *
   * @param value - Value to enqueue
   * @param priority - Priority (lower values = higher priority)
   */
  enqueue(value: T, priority: number): void {
    const item: PriorityQueueItem<T> = { value, priority };
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Remove and return item with lowest priority
   *
   * @returns Item with lowest priority, or undefined if empty
   */
  dequeue(): PriorityQueueItem<T> | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }

    if (this.heap.length === 1) {
      return this.heap.pop();
    }

    const min = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);

    return min;
  }

  /**
   * View item with lowest priority without removing it
   *
   * @returns Item with lowest priority, or undefined if empty
   */
  peek(): PriorityQueueItem<T> | undefined {
    return this.heap[0];
  }

  /**
   * Check if queue is empty
   *
   * @returns True if queue is empty
   */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Get number of items in queue
   *
   * @returns Number of items
   */
  size(): number {
    return this.heap.length;
  }

  /**
   * Bubble up element to maintain heap property
   *
   * @param index - Index of element to bubble up
   */
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);

      if (this.heap[index].priority >= this.heap[parentIndex].priority) {
        break;
      }

      // Swap with parent
      [this.heap[index], this.heap[parentIndex]] = [
        this.heap[parentIndex],
        this.heap[index],
      ];

      index = parentIndex;
    }
  }

  /**
   * Bubble down element to maintain heap property
   *
   * @param index - Index of element to bubble down
   */
  private bubbleDown(index: number): void {
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      // Check if left child is smaller
      if (
        leftChild < this.heap.length &&
        this.heap[leftChild].priority < this.heap[smallest].priority
      ) {
        smallest = leftChild;
      }

      // Check if right child is smaller
      if (
        rightChild < this.heap.length &&
        this.heap[rightChild].priority < this.heap[smallest].priority
      ) {
        smallest = rightChild;
      }

      // If current element is smallest, we're done
      if (smallest === index) {
        break;
      }

      // Swap with smallest child
      [this.heap[index], this.heap[smallest]] = [
        this.heap[smallest],
        this.heap[index],
      ];

      index = smallest;
    }
  }
}
