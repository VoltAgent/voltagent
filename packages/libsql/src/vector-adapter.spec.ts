/**
 * Tests for LibSQL Vector Adapter
 * Uses in-memory database for fast and reliable testing
 */

import type { VectorItem } from "@voltagent/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LibSQLVectorAdapter } from "./vector-adapter";

describe("LibSQLVectorAdapter", () => {
  let adapter: LibSQLVectorAdapter;

  beforeEach(async () => {
    // Use in-memory database for testing - fast and isolated
    adapter = new LibSQLVectorAdapter({
      url: "file::memory:",
      debug: false,
    });
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.close();
    }
  });

  describe("store", () => {
    it("should store a vector with metadata", async () => {
      const vector = [0.1, 0.2, 0.3, 0.4, 0.5];
      const metadata = { type: "test", category: "sample" };

      await adapter.store("test-1", vector, metadata);

      const retrieved = await adapter.get("test-1");
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe("test-1");
      expect(retrieved?.vector).toEqual(vector);
      expect(retrieved?.metadata).toEqual(metadata);
    });

    it("should update an existing vector", async () => {
      const vector1 = [0.1, 0.2, 0.3];
      const vector2 = [0.4, 0.5, 0.6];

      await adapter.store("test-1", vector1);
      await adapter.store("test-1", vector2);

      const retrieved = await adapter.get("test-1");
      expect(retrieved?.vector).toEqual(vector2);
    });

    it("should validate vector dimensions", async () => {
      const vector1 = [0.1, 0.2, 0.3];
      const vector2 = [0.4, 0.5]; // Different dimensions

      await adapter.store("test-1", vector1);

      await expect(adapter.store("test-2", vector2)).rejects.toThrow("Vector dimension mismatch");
    });

    it("should reject vectors exceeding max dimensions", async () => {
      const limitedAdapter = new LibSQLVectorAdapter({
        url: "file::memory:",
        maxVectorDimensions: 3,
      });

      const vector = [0.1, 0.2, 0.3, 0.4]; // 4 dimensions

      await expect(limitedAdapter.store("test-1", vector)).rejects.toThrow("exceed maximum");

      await limitedAdapter.close();
    });

    it("should store vector with content field", async () => {
      const vector = [0.1, 0.2, 0.3];
      const content = "This is the original text that was embedded";

      await adapter.store("test-1", vector, { content });

      const retrieved = await adapter.get("test-1");
      expect(retrieved?.metadata?.content).toBe(content);
    });
  });

  describe("storeBatch", () => {
    it("should store multiple vectors in batch", async () => {
      const items: VectorItem[] = [
        { id: "vec-1", vector: [0.1, 0.2, 0.3] },
        { id: "vec-2", vector: [0.4, 0.5, 0.6] },
        { id: "vec-3", vector: [0.7, 0.8, 0.9] },
      ];

      await adapter.storeBatch(items);

      const count = await adapter.count();
      expect(count).toBe(3);

      for (const item of items) {
        const retrieved = await adapter.get(item.id);
        expect(retrieved?.vector).toHaveLength(item.vector.length);
        for (let i = 0; i < item.vector.length; i++) {
          expect(retrieved?.vector[i]).toBeCloseTo(item.vector[i], 6);
        }
      }
    });

    it("should handle large batches with chunking", async () => {
      const items: VectorItem[] = [];
      for (let i = 0; i < 250; i++) {
        items.push({
          id: `vec-${i}`,
          vector: [Math.random(), Math.random(), Math.random()],
        });
      }

      await adapter.storeBatch(items);

      const count = await adapter.count();
      expect(count).toBe(250);
    });

    it("should validate dimensions in batch", async () => {
      const items: VectorItem[] = [
        { id: "vec-1", vector: [0.1, 0.2, 0.3] },
        { id: "vec-2", vector: [0.4, 0.5] }, // Different dimensions
      ];

      await expect(adapter.storeBatch(items)).rejects.toThrow("Vector dimension mismatch");
    });

    it("should rollback transaction on error", async () => {
      // First, store a valid vector
      await adapter.store("existing", [1, 2, 3]);

      // Try to store batch with dimension mismatch
      const items: VectorItem[] = [
        { id: "new-1", vector: [4, 5, 6] },
        { id: "new-2", vector: [7, 8] }, // Wrong dimensions
      ];

      await expect(adapter.storeBatch(items)).rejects.toThrow();

      // Neither item should have been stored
      expect(await adapter.get("new-1")).toBeNull();
      expect(await adapter.get("new-2")).toBeNull();

      // Original item should still exist
      expect(await adapter.get("existing")).toBeDefined();
    });
  });

  describe("search", () => {
    beforeEach(async () => {
      // Setup test vectors with known similarities
      const vectors: VectorItem[] = [
        {
          id: "vec-1",
          vector: [1, 0, 0],
          metadata: { category: "A", score: 1 },
        },
        {
          id: "vec-2",
          vector: [0, 1, 0],
          metadata: { category: "B", score: 2 },
        },
        {
          id: "vec-3",
          vector: [0, 0, 1],
          metadata: { category: "A", score: 3 },
        },
        {
          id: "vec-4",
          vector: [Math.SQRT1_2, Math.SQRT1_2, 0],
          metadata: { category: "B", score: 4 },
        },
        {
          id: "vec-5",
          vector: [0.577, 0.577, 0.577],
          metadata: { category: "C", score: 5 },
        },
      ];

      await adapter.storeBatch(vectors);
    });

    it("should find similar vectors", async () => {
      const queryVector = [1, 0, 0];
      const results = await adapter.search(queryVector, { limit: 3 });

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe("vec-1"); // Exact match
      expect(results[0].score).toBeCloseTo(1, 2);
    });

    it("should respect limit parameter", async () => {
      const queryVector = [0.5, 0.5, 0.5];
      const results = await adapter.search(queryVector, { limit: 2 });

      expect(results).toHaveLength(2);
    });

    it("should filter by threshold", async () => {
      const queryVector = [1, 0, 0];
      const results = await adapter.search(queryVector, {
        threshold: 0.9,
      });

      // Only very similar vectors should be returned
      expect(results.length).toBeLessThanOrEqual(2);
      for (const result of results) {
        expect(result.score).toBeGreaterThanOrEqual(0.9);
      }
    });

    it("should filter by metadata", async () => {
      const queryVector = [0.5, 0.5, 0.5];
      const results = await adapter.search(queryVector, {
        filter: { category: "A" },
      });

      expect(results.every((r) => r.metadata?.category === "A")).toBe(true);
    });

    it("should handle complex metadata filters", async () => {
      const results = await adapter.search([0.5, 0.5, 0.5], {
        filter: { category: "B", score: 4 },
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("vec-4");
    });

    it("should handle empty database", async () => {
      await adapter.clear();
      const queryVector = [1, 0, 0];
      const results = await adapter.search(queryVector);

      expect(results).toEqual([]);
    });

    it("should validate query vector dimensions", async () => {
      const queryVector = [1, 0]; // Wrong dimensions

      await expect(adapter.search(queryVector)).rejects.toThrow("dimension mismatch");
    });

    it("should return correct similarity scores", async () => {
      const queryVector = [Math.SQRT1_2, Math.SQRT1_2, 0];
      const results = await adapter.search(queryVector, { limit: 5 });

      // vec-4 should be the top match (exact match)
      expect(results[0].id).toBe("vec-4");
      expect(results[0].score).toBeCloseTo(1, 2);

      // Verify scores are in descending order
      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
      }
    });

    it("should calculate distance metric correctly", async () => {
      const queryVector = [1, 0, 0];
      const results = await adapter.search(queryVector);

      const exactMatch = results.find((r) => r.id === "vec-1");
      expect(exactMatch?.distance).toBeCloseTo(0, 2); // Distance should be ~0 for exact match

      const orthogonal = results.find((r) => r.id === "vec-2");
      expect(orthogonal?.distance).toBeCloseTo(1, 2); // Distance should be ~1 for orthogonal vectors
    });
  });

  describe("delete", () => {
    it("should delete a vector by ID", async () => {
      await adapter.store("test-1", [0.1, 0.2, 0.3]);
      await adapter.store("test-2", [0.4, 0.5, 0.6]);

      await adapter.delete("test-1");

      const deleted = await adapter.get("test-1");
      expect(deleted).toBeNull();

      const remaining = await adapter.get("test-2");
      expect(remaining).toBeDefined();

      const count = await adapter.count();
      expect(count).toBe(1);
    });

    it("should handle deletion of non-existent vector", async () => {
      // Should not throw
      await expect(adapter.delete("non-existent")).resolves.toBeUndefined();
    });

    it("should remove from cache when deleted", async () => {
      await adapter.store("test-1", [0.1, 0.2, 0.3]);

      // Access to cache it
      await adapter.get("test-1");

      // Delete it
      await adapter.delete("test-1");

      // Should return null, not cached value
      const result = await adapter.get("test-1");
      expect(result).toBeNull();
    });
  });

  describe("deleteBatch", () => {
    it("should delete multiple vectors", async () => {
      const items: VectorItem[] = [
        { id: "vec-1", vector: [0.1, 0.2, 0.3] },
        { id: "vec-2", vector: [0.4, 0.5, 0.6] },
        { id: "vec-3", vector: [0.7, 0.8, 0.9] },
        { id: "vec-4", vector: [1.0, 1.1, 1.2] },
      ];

      await adapter.storeBatch(items);
      await adapter.deleteBatch(["vec-1", "vec-3"]);

      expect(await adapter.get("vec-1")).toBeNull();
      expect(await adapter.get("vec-2")).toBeDefined();
      expect(await adapter.get("vec-3")).toBeNull();
      expect(await adapter.get("vec-4")).toBeDefined();

      const count = await adapter.count();
      expect(count).toBe(2);
    });

    it("should handle large batch deletions", async () => {
      const ids: string[] = [];
      const items: VectorItem[] = [];
      for (let i = 0; i < 150; i++) {
        const id = `vec-${i}`;
        ids.push(id);
        items.push({
          id,
          vector: [Math.random(), Math.random()],
        });
      }

      await adapter.storeBatch(items);
      await adapter.deleteBatch(ids.slice(0, 100));

      const count = await adapter.count();
      expect(count).toBe(50);
    });

    it("should handle empty batch", async () => {
      await adapter.store("test-1", [0.1, 0.2, 0.3]);

      await adapter.deleteBatch([]);

      const count = await adapter.count();
      expect(count).toBe(1);
    });
  });

  describe("clear", () => {
    it("should clear all vectors", async () => {
      const items: VectorItem[] = [
        { id: "vec-1", vector: [0.1, 0.2] },
        { id: "vec-2", vector: [0.3, 0.4] },
        { id: "vec-3", vector: [0.5, 0.6] },
      ];

      await adapter.storeBatch(items);
      await adapter.clear();

      const count = await adapter.count();
      expect(count).toBe(0);

      // Should also reset dimensions
      await adapter.store("new-vec", [1, 2, 3]); // Different dimensions
      const retrieved = await adapter.get("new-vec");
      expect(retrieved?.vector).toEqual([1, 2, 3]);
    });

    it("should clear cache along with data", async () => {
      await adapter.store("test-1", [0.1, 0.2, 0.3]);

      // Access to cache it
      await adapter.get("test-1");

      await adapter.clear();

      const stats = await adapter.getStats();
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe("count", () => {
    it("should return correct count of vectors", async () => {
      expect(await adapter.count()).toBe(0);

      await adapter.store("vec-1", [0.1, 0.2]);
      expect(await adapter.count()).toBe(1);

      await adapter.store("vec-2", [0.3, 0.4]);
      expect(await adapter.count()).toBe(2);

      await adapter.delete("vec-1");
      expect(await adapter.count()).toBe(1);
    });
  });

  describe("get", () => {
    it("should retrieve vector by ID", async () => {
      const vector = [0.1, 0.2, 0.3];
      const metadata = { type: "test" };
      const content = "Test content";

      await adapter.store("test-1", vector, metadata);

      const item: VectorItem = {
        id: "test-2",
        vector: [0.4, 0.5, 0.6],
        content,
      };
      await adapter.storeBatch([item]);

      const retrieved1 = await adapter.get("test-1");
      expect(retrieved1?.vector).toEqual(vector);
      expect(retrieved1?.metadata).toEqual(metadata);

      const retrieved2 = await adapter.get("test-2");
      expect(retrieved2?.content).toBe(content);
    });

    it("should return null for non-existent ID", async () => {
      const result = await adapter.get("non-existent");
      expect(result).toBeNull();
    });

    it("should return a copy to prevent external modifications", async () => {
      await adapter.store("test-1", [0.1, 0.2, 0.3], { test: true });

      const retrieved1 = await adapter.get("test-1");
      const retrieved2 = await adapter.get("test-1");

      expect(retrieved1).not.toBe(retrieved2);
      expect(retrieved1?.vector).not.toBe(retrieved2?.vector);
      expect(retrieved1?.metadata).not.toBe(retrieved2?.metadata);
    });
  });

  describe("caching", () => {
    it("should cache frequently accessed vectors", async () => {
      const cacheAdapter = new LibSQLVectorAdapter({
        url: "file::memory:",
        cacheSize: 2,
      });

      await cacheAdapter.store("vec-1", [0.1, 0.2]);
      await cacheAdapter.store("vec-2", [0.3, 0.4]);
      await cacheAdapter.store("vec-3", [0.5, 0.6]);

      // Access vec-1 and vec-2
      await cacheAdapter.get("vec-1");
      await cacheAdapter.get("vec-2");

      const stats1 = await cacheAdapter.getStats();
      expect(stats1.cacheSize).toBe(2);

      // Access vec-3, should evict vec-1 (LRU)
      await cacheAdapter.get("vec-3");

      const stats2 = await cacheAdapter.getStats();
      expect(stats2.cacheSize).toBe(2);

      await cacheAdapter.close();
    });

    it("should use cache for repeated access", async () => {
      const cacheAdapter = new LibSQLVectorAdapter({
        url: "file::memory:",
        cacheSize: 10,
      });

      const vector = [0.1, 0.2, 0.3];
      await cacheAdapter.store("test-1", vector);

      // First access - from database
      const first = await cacheAdapter.get("test-1");

      // Second access - should be from cache (faster)
      const start = Date.now();
      const second = await cacheAdapter.get("test-1");
      const duration = Date.now() - start;

      expect(first).toEqual(second);
      expect(duration).toBeLessThan(5); // Cache access should be very fast

      await cacheAdapter.close();
    });
  });

  describe("getStats", () => {
    it("should return statistics about the vector store", async () => {
      const stats1 = await adapter.getStats();
      expect(stats1.count).toBe(0);
      expect(stats1.dimensions).toBeNull();
      expect(stats1.cacheSize).toBe(0);

      await adapter.store("vec-1", [0.1, 0.2, 0.3]);
      await adapter.store("vec-2", [0.4, 0.5, 0.6]);

      const stats2 = await adapter.getStats();
      expect(stats2.count).toBe(2);
      expect(stats2.dimensions).toBe(3);
      expect(stats2.tableSizeBytes).toBeGreaterThan(0);
    });
  });

  describe("vector serialization", () => {
    it("should correctly serialize and deserialize vectors", async () => {
      const testVectors = [
        [0.0, 1.0, -1.0],
        [0.123456789, -0.987654321, 0.5],
        [1e-10, 1e10, Math.PI],
        Array(100)
          .fill(0)
          .map(() => Math.random() * 2 - 1), // Random 100-dim vector
      ];

      for (const vector of testVectors) {
        const id = `vec-${vector.length}`;
        await adapter.store(id, vector);
        const retrieved = await adapter.get(id);

        expect(retrieved?.vector).toHaveLength(vector.length);
        for (let i = 0; i < vector.length; i++) {
          expect(retrieved?.vector[i]).toBeCloseTo(vector[i], 5);
        }

        await adapter.clear(); // Reset dimensions for next test
      }
    });

    it("should handle edge case values", async () => {
      const edgeCases = [
        [Number.MIN_VALUE, Number.MAX_VALUE],
        [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN],
        [0, -0, 1, -1],
      ];

      for (const vector of edgeCases) {
        const id = `edge-${vector.length}`;
        await adapter.store(id, vector);
        const retrieved = await adapter.get(id);

        expect(retrieved?.vector).toHaveLength(vector.length);

        // Handle special float comparisons
        for (let i = 0; i < vector.length; i++) {
          if (Number.isNaN(vector[i])) {
            expect(Number.isNaN(retrieved?.vector[i])).toBe(true);
          } else if (!Number.isFinite(vector[i])) {
            expect(retrieved?.vector[i]).toBe(vector[i]);
          } else {
            expect(retrieved?.vector[i]).toBeCloseTo(vector[i], 5);
          }
        }

        await adapter.clear();
      }
    });
  });

  describe("error handling and retries", () => {
    it("should handle database errors gracefully", async () => {
      // Create adapter with very short retry delay
      const retryAdapter = new LibSQLVectorAdapter({
        url: "file::memory:",
        maxRetries: 2,
        retryDelayMs: 10,
      });

      // Store should work normally
      await retryAdapter.store("test-1", [0.1, 0.2, 0.3]);
      const result = await retryAdapter.get("test-1");
      expect(result).toBeDefined();

      await retryAdapter.close();
    });

    it("should validate inputs", async () => {
      // Empty vector
      await expect(adapter.store("test-1", [])).rejects.toThrow();

      // Invalid metadata (circular reference would cause safeStringify to fail)
      const circular: any = { a: 1 };
      circular.self = circular;

      // This should handle the error gracefully
      expect(await adapter.store("test-2", [0.1, 0.2, 0.3], circular)).toBe(undefined);
    });
  });

  describe("concurrent operations", () => {
    it("should handle concurrent stores", async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(adapter.store(`vec-${i}`, [Math.random(), Math.random()]));
      }

      await Promise.all(promises);
      const count = await adapter.count();
      expect(count).toBe(10);
    });

    it("should handle concurrent searches", async () => {
      const items: VectorItem[] = [];
      for (let i = 0; i < 20; i++) {
        items.push({
          id: `vec-${i}`,
          vector: [Math.random(), Math.random(), Math.random()],
        });
      }
      await adapter.storeBatch(items);

      const searchPromises = [];
      for (let i = 0; i < 5; i++) {
        searchPromises.push(
          adapter.search([Math.random(), Math.random(), Math.random()], {
            limit: 5,
          }),
        );
      }

      const results = await Promise.all(searchPromises);
      for (const result of results) {
        expect(result).toHaveLength(5);
      }
    });

    it("should handle mixed concurrent operations", async () => {
      // Initial data
      await adapter.storeBatch([
        { id: "initial-1", vector: [0.1, 0.2] },
        { id: "initial-2", vector: [0.3, 0.4] },
      ]);

      // Concurrent mixed operations
      const operations = [
        adapter.store("new-1", [0.5, 0.6]),
        adapter.search([0.1, 0.2], { limit: 1 }),
        adapter.get("initial-1"),
        adapter.delete("initial-2"),
        adapter.count(),
      ];

      const results = await Promise.all(operations);

      // Verify operations completed
      expect(results[1]).toBeDefined(); // search result
      expect(results[2]).toBeDefined(); // get result
      expect(typeof results[4]).toBe("number"); // count result
    });
  });

  describe("performance", () => {
    it("should handle large vectors efficiently", async () => {
      const largeVector = new Array(1536).fill(0).map(() => Math.random());

      const start = Date.now();
      await adapter.store("large-1", largeVector);
      const storeTime = Date.now() - start;

      const searchStart = Date.now();
      await adapter.search(largeVector, { limit: 1 });
      const searchTime = Date.now() - searchStart;

      // Should complete in reasonable time
      expect(storeTime).toBeLessThan(100);
      expect(searchTime).toBeLessThan(100);
    });

    it("should scale with many vectors", async () => {
      const dimension = 128;
      const count = 1000;

      // Generate test vectors
      const items: VectorItem[] = [];
      for (let i = 0; i < count; i++) {
        items.push({
          id: `scale-${i}`,
          vector: new Array(dimension).fill(0).map(() => Math.random()),
          metadata: { index: i, group: i % 10 },
        });
      }

      // Batch insert
      const insertStart = Date.now();
      await adapter.storeBatch(items);
      const insertTime = Date.now() - insertStart;

      // Search
      const queryVector = new Array(dimension).fill(0).map(() => Math.random());
      const searchStart = Date.now();
      const results = await adapter.search(queryVector, { limit: 10 });
      const searchTime = Date.now() - searchStart;

      expect(results).toHaveLength(10);
      expect(insertTime).toBeLessThan(5000); // Should insert 1000 vectors in < 5s
      expect(searchTime).toBeLessThan(1000); // Should search 1000 vectors in < 1s
    });
  });
});
