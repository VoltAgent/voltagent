import { MongoClient } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MongoDBMemoryAdapter } from "./memory-adapter";

vi.mock("mongodb", () => {
  const collection = {
    createIndex: vi.fn(),
    insertOne: vi.fn(),
    insertMany: vi.fn(),
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    findOne: vi.fn(),
    updateOne: vi.fn(),
    deleteMany: vi.fn(),
    deleteOne: vi.fn(),
    countDocuments: vi.fn(),
    bulkWrite: vi.fn(),
  };

  const db = {
    collection: vi.fn().mockReturnValue(collection),
  };

  const client = {
    connect: vi.fn(),
    db: vi.fn().mockReturnValue(db),
    close: vi.fn(),
  };

  return {
    MongoClient: vi.fn().mockImplementation(() => client),
  };
});

describe("MongoDBMemoryAdapter", () => {
  let adapter: MongoDBMemoryAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new MongoDBMemoryAdapter({
      connection: "mongodb://localhost:27017",
    });
  });

  afterEach(async () => {
    await adapter.close();
  });

  it("should be defined", () => {
    expect(adapter).toBeDefined();
  });

  it("should initialize correctly", async () => {
    await (adapter as any).initialize();
    expect(MongoClient).toHaveBeenCalledTimes(1);
  });

  it("should perform createConversation", async () => {
    const input = {
      id: "test-conv-id",
      resourceId: "resource-1",
      userId: "user-1",
      title: "Test Conversation",
      metadata: {},
    };

    const conv = await adapter.createConversation(input);
    expect(conv.id).toBe(input.id);
  });
});
