import { describe, expect, it } from "vitest";
import { InMemoryVectorAdapter } from "./in-memory";

describe("InMemoryVectorAdapter search result isolation", () => {
  it.each(["store", "get", "search"])(
    "isolates metadata with an overridden buffer slice at the %s boundary",
    async (operation) => {
      const adapter = new InMemoryVectorAdapter();
      const buffer = new ArrayBuffer(4);
      Object.defineProperty(buffer, "slice", { value: () => buffer, enumerable: true });
      new Uint8Array(buffer)[0] = 1;
      await adapter.store("memory", [1, 0], { fn: () => "test", buffer });
      if (operation === "store") {
        new Uint8Array(buffer)[0] = 9;
      } else {
        const result =
          operation === "search" ? (await adapter.search([1, 0]))[0] : await adapter.get("memory");
        new Uint8Array(result?.metadata?.buffer as ArrayBuffer)[0] = 9;
      }
      const stored = (await adapter.get("memory"))?.metadata?.buffer as ArrayBuffer;
      expect(new Uint8Array(stored)[0]).toBe(1);
    },
  );

  it.each(["native", "fallback"])(
    "copies custom class metadata as plain data using the %s clone path",
    async (mode) => {
      class CustomMetadata {
        labels = ["original"];
        label() {
          return this.labels[0];
        }
      }
      const adapter = new InMemoryVectorAdapter();
      const item = new CustomMetadata();
      await adapter.store("memory", [1, 0], {
        item,
        fn: mode === "fallback" ? () => "test" : undefined,
      });
      item.labels.push("changed");
      const fetched = await adapter.get("memory");
      const [searched] = await adapter.search([1, 0]);
      for (const result of [fetched, searched]) {
        const copied = result?.metadata?.item as CustomMetadata;
        expect(Object.getPrototypeOf(copied)).toBe(Object.prototype);
        expect(copied).not.toBeInstanceOf(CustomMetadata);
        expect(copied.label).toBeUndefined();
        expect(copied.labels).toEqual(["original"]);
      }
    },
  );

  it.each(["store", "get", "search"])(
    "preserves and isolates binary metadata at the %s boundary",
    async (operation) => {
      const adapter = new InMemoryVectorAdapter();
      const bytes = new Uint8Array([1, 2, 3]);
      await adapter.store("memory", [1, 0], { fn: () => "test", bytes });
      if (operation === "store") {
        bytes[0] = 9;
      } else {
        const result =
          operation === "search" ? (await adapter.search([1, 0]))[0] : await adapter.get("memory");
        const resultBytes = result?.metadata?.bytes as Uint8Array;
        expect(resultBytes.byteLength).toBe(3);
        resultBytes[0] = 9;
      }
      const storedBytes = (await adapter.get("memory"))?.metadata?.bytes as Uint8Array;
      expect(storedBytes.byteLength).toBe(3);
      expect([...storedBytes]).toEqual([1, 2, 3]);
    },
  );

  it.each(["search", "get", "store"])(
    "isolates nested metadata containing functions at the %s boundary",
    async (operation) => {
      const adapter = new InMemoryVectorAdapter();
      const fn = () => "label";
      const metadata = { context: { labels: ["original"] }, fn };
      await adapter.store("memory", [1, 0], metadata);

      if (operation === "store") {
        metadata.context.labels.push("changed");
      } else {
        const result =
          operation === "search" ? (await adapter.search([1, 0]))[0] : await adapter.get("memory");
        const context = result?.metadata?.context as typeof metadata.context;
        context.labels.push("changed");
      }

      expect((await adapter.get("memory"))?.metadata).toEqual({
        context: { labels: ["original"] },
        fn,
      });
    },
  );

  it.each(["search", "get", "store"])(
    "isolates nested metadata at the %s boundary",
    async (operation) => {
      const adapter = new InMemoryVectorAdapter();
      const metadata = { context: { labels: ["original"] } };
      await adapter.store("memory", [1, 0], metadata);

      if (operation === "store") {
        metadata.context.labels.push("changed");
      } else {
        const result =
          operation === "search" ? (await adapter.search([1, 0]))[0] : await adapter.get("memory");
        const context = result?.metadata?.context as typeof metadata.context;
        context.labels.push("changed");
      }

      expect((await adapter.get("memory"))?.metadata).toEqual({
        context: { labels: ["original"] },
      });
    },
  );

  it("does not let a returned embedding corrupt future similarity searches", async () => {
    const adapter = new InMemoryVectorAdapter();
    await adapter.store("matching", [1, 0], { userId: "alice" });
    await adapter.store("other", [0, 1], { userId: "alice" });

    const [result] = await adapter.search([1, 0]);
    result.vector[0] = 0;
    result.vector[1] = 1;

    expect((await adapter.get("matching"))?.vector).toEqual([1, 0]);
    const [nextResult] = await adapter.search([1, 0]);
    expect(nextResult.id).toBe("matching");
    expect(nextResult.score).toBe(1);
  });

  it("does not let returned metadata change user-scoped retrieval", async () => {
    const adapter = new InMemoryVectorAdapter();
    await adapter.store("memory", [1, 0], { userId: "alice" });

    const [result] = await adapter.search([1, 0], { filter: { userId: "alice" } });
    if (!result.metadata) throw new Error("Expected stored metadata");
    result.metadata.userId = "bob";

    expect(await adapter.search([1, 0], { filter: { userId: "bob" } })).toEqual([]);
    expect(await adapter.search([1, 0], { filter: { userId: "alice" } })).toHaveLength(1);
    expect((await adapter.get("memory"))?.metadata).toEqual({ userId: "alice" });
  });

  it("supports results without metadata and keeps stored input isolated", async () => {
    const adapter = new InMemoryVectorAdapter();
    const vector = [1, 0];
    await adapter.store("memory", vector);
    vector[0] = 0;

    const [result] = await adapter.search([1, 0]);
    expect(result.vector).toEqual([1, 0]);
    expect(result.metadata).toBeUndefined();
    expect(result.score).toBe(1);
  });
});
