import { vi } from "vitest";

export type SupabaseResult = {
  data: any;
  error: any;
  count?: number;
};

export const ok = (data: any = null, extra?: Partial<SupabaseResult>): SupabaseResult => ({
  data,
  error: null,
  ...(extra || {}),
});

export const notFound = (message = "Not found"): SupabaseResult => ({
  data: null,
  error: { code: "PGRST116", message },
});

export const dbError = (message: string, code?: string): SupabaseResult => ({
  data: null,
  error: code ? { code, message } : { message },
});

/**
 * Create an awaitable, chainable query builder similar to Supabase.
 * Supports both `await query` and `.single()` patterns.
 */
export const createQueryBuilder = (result: SupabaseResult) => {
  const promise: any = Promise.resolve(result);
  const builder: any = promise;
  // chainable methods
  builder.select = vi.fn(() => builder);
  builder.insert = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.delete = vi.fn(() => builder);
  builder.upsert = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.in = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.limit = vi.fn(() => builder);
  builder.lt = vi.fn(() => builder);
  builder.gt = vi.fn(() => builder);
  builder.gte = vi.fn(() => builder);
  builder.lte = vi.fn(() => builder);
  builder.range = vi.fn(() => builder);
  builder.contains = vi.fn(() => builder);
  // single() resolves to the same shape as an awaited query
  builder.single = vi.fn(() => Promise.resolve(result));
  return builder;
};

/**
 * Create a mock Supabase client with per-table queued responses.
 * Each `from(table)` call consumes the next queued item for that table.
 */
export const createSupabaseMock = () => {
  const tableQueues = new Map<string, any[]>();
  const lastBuilder = new Map<string, any>();
  const history = new Map<string, any[]>();

  const nextFor = (table: string) => {
    const q = tableQueues.get(table);
    let builder: any;
    if (q && q.length > 0) {
      const item = q.shift();
      if (item && typeof item === "object" && "then" in item && "select" in item) {
        builder = item;
      } else {
        builder = createQueryBuilder(item as SupabaseResult);
      }
    } else {
      builder = createQueryBuilder(ok([]));
    }
    lastBuilder.set(table, builder);
    const arr = history.get(table) || [];
    arr.push(builder);
    history.set(table, arr);
    return builder;
  };

  const client = {
    from: vi.fn((table: string) => nextFor(table)),
    rpc: vi.fn(),
  } as any;

  return {
    client,
    queue: (table: string, ...items: Array<SupabaseResult | any>) => {
      const arr = tableQueues.get(table) || [];
      arr.push(...items);
      tableQueues.set(table, arr);
    },
    getLast: (table: string) => lastBuilder.get(table),
    getHistory: (table: string) => history.get(table) || [],
    clear: () => {
      tableQueues.clear();
      lastBuilder.clear();
      history.clear();
    },
  };
};
