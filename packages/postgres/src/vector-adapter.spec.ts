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
});
