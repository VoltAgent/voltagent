import type { UIMessage } from "ai";
import { describe, expectTypeOf, it } from "vitest";
import type { OperationContext } from "../agent/types";
import {
  type Conversation,
  ConversationAlreadyExistsError,
  ConversationNotFoundError,
  type ConversationQueryOptions,
  type CreateConversationInput,
  type EmbeddingAdapter,
  type GetMessagesOptions,
  Memory,
  type MemoryConfig,
  type SearchOptions,
  type SearchResult,
  type StorageAdapter,
  type VectorAdapter,
  type VectorItem,
} from "./index";

describe("Memory V2 Type System", () => {
  // Mock adapters for type testing
  const mockStorageAdapter: StorageAdapter = {
    addMessage: async () => {},
    addMessages: async () => {},
    getMessages: async () => [],
    clearMessages: async () => {},
    deleteMessages: async () => {},
    createConversation: async () => ({
      id: "test",
      resourceId: "res",
      userId: "user",
      title: "Test",
      metadata: {},
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    }),
    getConversation: async () => null,
    getConversations: async () => [],
    getConversationsByUserId: async () => [],
    queryConversations: async () => [],
    countConversations: async () => 0,
    updateConversation: async () => ({
      id: "test",
      resourceId: "res",
      userId: "user",
      title: "Test",
      metadata: {},
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    }),
    deleteConversation: async () => {},
    getWorkingMemory: async () => null,
    setWorkingMemory: async () => {},
    deleteWorkingMemory: async () => {},
    getWorkflowState: async () => null,
    queryWorkflowRuns: async () => [],
    setWorkflowState: async () => {},
    updateWorkflowState: async () => {},
    getSuspendedWorkflowStates: async () => [],
  };

  const mockEmbeddingAdapter: EmbeddingAdapter = {
    embed: async () => new Array(384).fill(0),
    embedBatch: async () => [new Array(384).fill(0)],
    getDimensions: () => 384,
    getModelName: () => "test-model",
  };

  const mockVectorAdapter: VectorAdapter = {
    store: async () => {},
    storeBatch: async () => {},
    search: async () => [],
    delete: async () => {},
    deleteBatch: async () => {},
    clear: async () => {},
    count: async () => 0,
    get: async () => null,
  };

  describe("Memory Constructor Type Inference", () => {
    it("should accept only StorageAdapter as required", () => {
      const memory = new Memory({
        storage: mockStorageAdapter,
      });

      expectTypeOf(memory).toMatchTypeOf<Memory>();
    });

    it("should accept optional EmbeddingAdapter", () => {
      const memory = new Memory({
        storage: mockStorageAdapter,
        embedding: mockEmbeddingAdapter,
      });

      expectTypeOf(memory).toMatchTypeOf<Memory>();
    });

    it("should accept optional VectorAdapter", () => {
      const memory = new Memory({
        storage: mockStorageAdapter,
        vector: mockVectorAdapter,
      });

      expectTypeOf(memory).toMatchTypeOf<Memory>();
    });

    it("should accept complete MemoryConfig", () => {
      const options: MemoryConfig = {
        storage: mockStorageAdapter,
        embedding: mockEmbeddingAdapter,
        vector: mockVectorAdapter,
        enableCache: true,
      };

      const memory = new Memory(options);
      expectTypeOf(memory).toMatchTypeOf<Memory>();
    });

    it("should enforce required storage field", () => {
      // @ts-expect-error - storage is required
      new Memory({});

      // @ts-expect-error - storage is required even with other fields
      new Memory({
        embedding: mockEmbeddingAdapter,
        vector: mockVectorAdapter,
      });
    });
  });

  describe("StorageAdapter Interface", () => {
    it("should enforce UIMessage type for addMessage", () => {
      const adapter: StorageAdapter = mockStorageAdapter;

      expectTypeOf(adapter.addMessage).parameters.toMatchTypeOf<
        [UIMessage, string, string, OperationContext?]
      >();
      expectTypeOf(adapter.addMessage).returns.toMatchTypeOf<Promise<void>>();
    });

    it("should enforce UIMessage array for addMessages", () => {
      const adapter: StorageAdapter = mockStorageAdapter;

      expectTypeOf(adapter.addMessages).parameters.toMatchTypeOf<
        [UIMessage[], string, string, OperationContext?]
      >();
      expectTypeOf(adapter.addMessages).returns.toMatchTypeOf<Promise<void>>();
    });

    it("should return UIMessage array from getMessages", () => {
      const adapter: StorageAdapter = mockStorageAdapter;

      expectTypeOf(adapter.getMessages).returns.toMatchTypeOf<Promise<UIMessage[]>>();
    });

    it("should enforce messageIds for deleteMessages", () => {
      const adapter: StorageAdapter = mockStorageAdapter;

      expectTypeOf(adapter.deleteMessages).parameters.toMatchTypeOf<
        [string[], string, string, OperationContext?]
      >();
      expectTypeOf(adapter.deleteMessages).returns.toMatchTypeOf<Promise<void>>();
    });

    it("should enforce Conversation type for createConversation", () => {
      const adapter: StorageAdapter = mockStorageAdapter;

      expectTypeOf(adapter.createConversation).parameters.toMatchTypeOf<
        [CreateConversationInput]
      >();
      expectTypeOf(adapter.createConversation).returns.toMatchTypeOf<Promise<Conversation>>();
    });

    it("should enforce query options type", () => {
      const adapter: StorageAdapter = mockStorageAdapter;

      expectTypeOf(adapter.queryConversations).parameters.toMatchTypeOf<
        [ConversationQueryOptions]
      >();
      expectTypeOf(adapter.queryConversations).returns.toMatchTypeOf<Promise<Conversation[]>>();
    });

    it("should return number from countConversations", () => {
      const adapter: StorageAdapter = mockStorageAdapter;

      expectTypeOf(adapter.countConversations).parameters.toMatchTypeOf<
        [ConversationQueryOptions]
      >();
      expectTypeOf(adapter.countConversations).returns.toMatchTypeOf<Promise<number>>();
    });
  });

  describe("EmbeddingAdapter Interface", () => {
    it("should accept string and return number array", () => {
      const adapter: EmbeddingAdapter = mockEmbeddingAdapter;

      expectTypeOf(adapter.embed).parameters.toMatchTypeOf<[string]>();
      expectTypeOf(adapter.embed).returns.toMatchTypeOf<Promise<number[]>>();
    });

    it("should accept string array and return number array array", () => {
      const adapter: EmbeddingAdapter = mockEmbeddingAdapter;

      expectTypeOf(adapter.embedBatch).parameters.toMatchTypeOf<[string[]]>();
      expectTypeOf(adapter.embedBatch).returns.toMatchTypeOf<Promise<number[][]>>();
    });

    it("should have getDimensions method", () => {
      const adapter: EmbeddingAdapter = mockEmbeddingAdapter;

      expectTypeOf(adapter.getDimensions).returns.toMatchTypeOf<number | undefined>();
    });

    it("should have getModelName method", () => {
      const adapter: EmbeddingAdapter = mockEmbeddingAdapter;

      expectTypeOf(adapter.getModelName).returns.toMatchTypeOf<string>();
    });
  });

  describe("VectorAdapter Interface", () => {
    it("should enforce VectorItem type for store", () => {
      const adapter: VectorAdapter = mockVectorAdapter;

      expectTypeOf(adapter.store).parameters.toMatchTypeOf<
        [string, number[], Record<string, any>?]
      >();
    });

    it("should return SearchResult array from search", () => {
      const adapter: VectorAdapter = mockVectorAdapter;

      expectTypeOf(adapter.search).returns.toMatchTypeOf<Promise<SearchResult[]>>();
    });

    it("should enforce VectorItem array for storeBatch", () => {
      const adapter: VectorAdapter = mockVectorAdapter;

      expectTypeOf(adapter.storeBatch).parameters.toMatchTypeOf<[VectorItem[]]>();
    });
  });

  describe("Memory Method Return Types", () => {
    it("should return void for addMessage", () => {
      const memory = new Memory({ storage: mockStorageAdapter });

      expectTypeOf(memory.addMessage).returns.toMatchTypeOf<Promise<void>>();
    });

    it("should return UIMessage array for getMessages", () => {
      const memory = new Memory({ storage: mockStorageAdapter });

      expectTypeOf(memory.getMessages).returns.toMatchTypeOf<Promise<UIMessage[]>>();
    });

    it("should return Conversation for createConversation", () => {
      const memory = new Memory({ storage: mockStorageAdapter });

      expectTypeOf(memory.createConversation).returns.toMatchTypeOf<Promise<Conversation>>();
    });

    it("should return void for clearMessages", () => {
      const memory = new Memory({ storage: mockStorageAdapter });

      expectTypeOf(memory.clearMessages).returns.toMatchTypeOf<Promise<void>>();
    });

    it("should return void for deleteMessages", () => {
      const memory = new Memory({ storage: mockStorageAdapter });

      expectTypeOf(memory.deleteMessages).returns.toMatchTypeOf<Promise<void>>();
    });

    it("should return number for countConversations", () => {
      const memory = new Memory({ storage: mockStorageAdapter });

      expectTypeOf(memory.countConversations).returns.toMatchTypeOf<Promise<number>>();
    });
  });

  describe("Type Parameter Constraints", () => {
    it("should enforce GetMessagesOptions structure", () => {
      const options: GetMessagesOptions = {
        limit: 10,
        before: new Date(),
        after: new Date(),
        roles: ["user", "assistant"],
      };

      expectTypeOf(options).toMatchTypeOf<GetMessagesOptions>();
    });

    it("should enforce SearchOptions structure", () => {
      const options: SearchOptions = {
        limit: 5,
        threshold: 0.8,
        filter: { conversationId: "conv-1", role: "user" },
      };

      expectTypeOf(options).toMatchTypeOf<SearchOptions>();
    });

    it("should enforce ConversationQueryOptions structure", () => {
      const options: ConversationQueryOptions = {
        userId: "user-1",
        resourceId: "res-1",
        limit: 20,
        offset: 0,
        orderBy: "created_at",
        orderDirection: "DESC",
      };

      expectTypeOf(options).toMatchTypeOf<ConversationQueryOptions>();
    });
  });

  describe("Error Types", () => {
    it("should extend Error class", () => {
      const error1 = new ConversationAlreadyExistsError("test");
      const error2 = new ConversationNotFoundError("test");

      expectTypeOf(error1).toMatchTypeOf<Error>();
      expectTypeOf(error2).toMatchTypeOf<Error>();
    });

    it("should have code and details properties", () => {
      const error1 = new ConversationAlreadyExistsError("test");
      const error2 = new ConversationNotFoundError("test");

      expectTypeOf(error1.code).toBeString();
      expectTypeOf(error2.code).toBeString();
      expectTypeOf(error1.details).toMatchTypeOf<Record<string, unknown> | undefined>();
      expectTypeOf(error2.details).toMatchTypeOf<Record<string, unknown> | undefined>();
    });
  });

  describe("Generic Type Parameters", () => {
    it("should allow any metadata type in Conversation", () => {
      const conv1: Conversation = {
        id: "1",
        resourceId: "res",
        userId: "user",
        title: "Test",
        metadata: { custom: "data", nested: { value: 123 } },
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      };

      expectTypeOf(conv1.metadata).toMatchTypeOf<Record<string, any>>();
    });

    it("should allow any metadata in VectorItem", () => {
      const item: VectorItem = {
        id: "vec-1",
        vector: [0.1, 0.2, 0.3],
        metadata: {
          messageId: "msg-1",
          customField: "value",
          nested: { data: true },
        },
      };

      expectTypeOf(item.metadata).toMatchTypeOf<Record<string, any> | undefined>();
    });
  });
});
