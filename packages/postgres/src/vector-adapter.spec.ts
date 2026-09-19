import { encodeCursor } from "@voltagent/core";
import { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostgreSQLVectorAdapter } from "./vector-adapter";

vi.mock("pg", () => ({
  Pool: vi.fn(),
}));

describe.sequential("PostgreSQLVectorAdapter", () => {
  const mockQuery = vi.fn();
  const mockRelease = vi.fn();
  const mockConnect = vi.fn();
  const mockEnd = vi.fn();

  let adapter: PostgreSQLVectorAdapter;

  type QueryStep = { rows?: any[]; error?: Error };
  let queue: QueryStep[];

  const enqueue = (rows: any[] = []) => {
    queue.push({ rows });
  };

  const enqueueScalar = (value: unknown) => {
    queue.push({ rows: [{ count: value }] });
  };

  const setupInitializationQueue = () => {
    // BEGIN, CREATE TABLE, CREATE INDEX (2x), COMMIT
    enqueue();
    enqueue();
    enqueue();
    enqueue();
    enqueue();
  };

  beforeEach(() => {
    queue = [];
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockReset();
    mockEnd.mockReset();

    mockQuery.mockImplementation(() => {
      const step = queue.shift();
      if (!step) {
        throw new Error("No query queued");
      }
      if (step.error) {
        return Promise.reject(step.error);
      }
      return Promise.resolve({ rows: step.rows ?? [] });
    });

    const mockClient = {
      query: mockQuery,
      release: mockRelease,
    };

    mockConnect.mockResolvedValue(mockClient);

    vi.mocked(Pool).mockImplementation(
      () =>
        ({
          connect: mockConnect,
          end: mockEnd,
        }) as unknown as Pool,
    );

    setupInitializationQueue();

    adapter = new PostgreSQLVectorAdapter({
      connection: {
        host: "localhost",
        port: 5432,
        database: "test",
        user: "test",
        password: "test",
      },
      tablePrefix: "test_vectors",
    });
  });

  afterEach(async () => {
    await adapter.close();
    expect(mockEnd).toHaveBeenCalled();
  });

  it("initializes schema on first use", async () => {
    enqueueScalar(0); // count query result

    await adapter.count();

    const executedSql = mockQuery.mock.calls.map((call) => String(call[0]));
    expect(executedSql).toEqual(
      expect.arrayContaining([
        expect.stringContaining("CREATE TABLE IF NOT EXISTS test_vectors_vectors"),
        expect.stringContaining("CREATE INDEX IF NOT EXISTS idx_test_vectors_vectors_created"),
        expect.stringContaining("CREATE INDEX IF NOT EXISTS idx_test_vectors_vectors_dimensions"),
      ]),
    );
  });

  it("stores vectors with metadata", async () => {
    enqueue(); // store insert

    await adapter.store("vec-1", [0.1, 0.9], { topic: "test" });

    const [, params] = mockQuery.mock.calls[mockQuery.mock.calls.length - 1];
    expect(mockQuery.mock.calls[mockQuery.mock.calls.length - 1][0]).toContain(
      "INSERT INTO test_vectors_vectors",
    );
    expect(params[0]).toBe("vec-1");
    expect(params[1]).toBeInstanceOf(Buffer);
    expect(params[2]).toBe(2);
    expect(JSON.parse(params[3])).toEqual({ topic: "test" });
  });

  it("performs cosine-similarity search", async () => {
    enqueue(); // storeBatch BEGIN
    enqueue(); // INSERT
    enqueue(); // COMMIT

    await adapter.storeBatch([
      {
        id: "vec-1",
        vector: [1, 0],
        metadata: { label: "a" },
        content: "hello",
      },
    ]);

    const buffer = Buffer.allocUnsafe(8);
    buffer.writeFloatLE(1, 0);
    buffer.writeFloatLE(0, 4);

    enqueue([
      {
        id: "vec-1",
        vector: buffer,
        dimensions: 2,
        metadata: { label: "a" },
        content: "hello",
      },
    ]);

    const results = await adapter.search([1, 0], { limit: 1 });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("vec-1");
    expect(results[0].score).toBeCloseTo(1);
    expect(results[0].metadata).toEqual({ label: "a" });
    expect(results[0].content).toBe("hello");
  });

  const vectorRow = (overrides: Record<string, unknown> = {}) => {
    const buffer = Buffer.allocUnsafe(8);
    buffer.writeFloatLE(1, 0);
    buffer.writeFloatLE(0, 4);
    return {
      id: "vec-1",
      vector: buffer,
      dimensions: 2,
      metadata: {},
      content: null,
      ...overrides,
    };
  };

  it("pushes metadata equality filters down as a JSONB containment predicate", async () => {
    enqueue([vectorRow({ id: "vec-1", metadata: { topic: "ai" } })]);

    const results = await adapter.search([1, 0], { filter: { topic: "ai" } });

    const [sql, params] = mockQuery.mock.calls[mockQuery.mock.calls.length - 1];
    expect(String(sql)).toContain("metadata @> $1::jsonb");
    expect(JSON.parse(String(params[0]))).toEqual({ topic: "ai" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("vec-1");
  });

  it("uses a bound parameter cursor instead of a database escape call", async () => {
    enqueue([vectorRow()]);

    const cursor = encodeCursor("vec-1");
    await adapter.search([1, 0], { cursor });

    const [sql, params] = mockQuery.mock.calls[mockQuery.mock.calls.length - 1];
    expect(String(sql)).toContain("id < $1");
    expect(params[0]).toBe("vec-1");
  });

  it("does not push LIMIT into SQL when in-memory predicates are present", async () => {
    enqueue([
      vectorRow({ id: "vec-1", metadata: { price: 100 } }),
      vectorRow({ id: "vec-2", metadata: { price: 200 } }),
    ]);

    const results = await adapter.search([1, 0], {
      comparisonFilter: { price: { $gt: 150 } },
      limit: 5,
    });

    const [sql] = mockQuery.mock.calls[mockQuery.mock.calls.length - 1];
    expect(String(sql)).not.toMatch(/\bLIMIT\b/i);

    // Only vec-2 (price 200) survives the in-memory comparison filter
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("vec-2");
  });

  it("applies logical $and filters in memory after fetching", async () => {
    enqueue([
      vectorRow({ id: "vec-1", metadata: { category: "A", status: "active" } }),
      vectorRow({ id: "vec-2", metadata: { category: "A", status: "inactive" } }),
    ]);

    const results = await adapter.search([1, 0], {
      logicalFilter: { $and: [{ category: "A" }, { status: "active" }] },
    });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("vec-1");
  });
});
