import { describe, expect, it } from "vitest";
import { InMemoryVectorAdapter } from "./in-memory";

describe("InMemoryVectorAdapter search result isolation", () => {
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
