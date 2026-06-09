# Core Memory

Shared memory contracts, types, and orchestration for conversations, working memory, semantic search, and workflow state. External adapter packages (`postgres`, `libsql`, `supabase`, `cloudflare-d1`, `voltagent-memory`) implement these contracts.

## Critical Rules

- **Adapter contracts are cross-package API.** `StorageAdapter`, `VectorAdapter`, `EmbeddingAdapter` signature changes break every external adapter. Coordinate updates and add a changeset for each affected package.
- **Message and Conversation shapes are load-bearing.** `UIMessage`, `Conversation`, `ConversationStepRecord`, `WorkflowStateEntry` are persisted by adapters and consumed by agents, workflows, server APIs, and the SDK. Treat as wire-compatible.
- **Adapter-neutral logic only.** Platform-specific SQL, HTTP, or cloud SDK code belongs in the adapter package, not here.
- **`safeStringify` for persistence and logs.** Import from `@voltagent/internal`.
- **Type inference is API.** Add `index.spec-d.ts` coverage when changing public memory generics or adapter generics.

## Adapter Contracts

The interfaces below are **partial summaries** of the load-bearing methods. Read `memory/types.ts` for the canonical signatures (queryConversations variants, workflow run queries, etc.).

```ts
// StorageAdapter — implemented by postgres / libsql / supabase / cloudflare-d1 / voltagent-memory
interface StorageAdapter {
  // Messages
  addMessage(message: UIMessage, userId, conversationId, context?): Promise<void>;
  addMessages(messages: UIMessage[], userId, conversationId, context?): Promise<void>;
  getMessages(
    userId,
    conversationId,
    options?,
    context?
  ): Promise<UIMessage<{ createdAt: Date }>[]>;
  deleteMessages(messageIds: string[], userId, conversationId, context?): Promise<void>;
  clearMessages(userId, conversationId?, context?): Promise<void>;

  // Conversations
  createConversation(input: CreateConversationInput): Promise<Conversation>;
  getConversation(id): Promise<Conversation | null>;
  queryConversations(options): Promise<Conversation[]>;
  updateConversation(id, updates): Promise<Conversation>;
  deleteConversation(id): Promise<void>;

  // Working memory + workflow state
  getWorkingMemory(params): Promise<string | null>;
  setWorkingMemory(params): Promise<void>;
  deleteWorkingMemory(params): Promise<void>;
  getWorkflowState(executionId): Promise<WorkflowStateEntry | null>;
  setWorkflowState(executionId, state): Promise<void>;
  updateWorkflowState(executionId, updates): Promise<void>;
  getSuspendedWorkflowStates(workflowId?): Promise<WorkflowStateEntry[]>;
  // … plus query helpers (queryWorkflowRuns, getConversations, countConversations, etc.) — see types.ts

  // Optional: detailed tracing
  saveConversationSteps?(steps: ConversationStepRecord[]): Promise<void>;
  getConversationSteps?(userId, conversationId, options?): Promise<ConversationStepRecord[]>;
}

interface VectorAdapter {
  store(id: string, vector: number[], metadata?): Promise<void>;
  storeBatch(items: VectorItem[]): Promise<void>;
  search(vector: number[], options?: { limit?; threshold?; filter? }): Promise<SearchResult[]>;
  delete(id: string): Promise<void>;
  deleteBatch(ids: string[]): Promise<void>;
  clear(): Promise<void>;
}

interface EmbeddingAdapter {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
  getModelName(): string;
}
```

## External Adapter Packages

Cross-check these whenever you change a contract above:

- `packages/postgres` — Postgres + pgvector
- `packages/libsql` — LibSQL / Turso
- `packages/supabase` — Supabase (pgvector)
- `packages/cloudflare-d1` — Cloudflare D1 (SQLite)
- `packages/voltagent-memory` — managed VoltOps memory

## Memory Orchestration

`Memory` (in `index.ts`) owns the storage adapter and optional embedding + vector adapters. When all three are configured, messages are auto-embedded on save and `getMessagesWithSemanticSearch()` merges recent + similar messages.

```ts
const memory = new Memory({
  storage: new InMemoryStorageAdapter(),
  embedding: new AiSdkEmbeddingAdapter("openai/text-embedding-3-small"),
  vector: new InMemoryVectorAdapter(),
  enableCache: true,
});

await memory.addMessage(msg, userId, conversationId);

const merged = await memory.getMessagesWithSemanticSearch(
  userId,
  conversationId,
  "tell me about workflows",
  { limit: 10, semanticLimit: 5, mergeStrategy: "interleave" }
);
```

`MemoryManager` (in `manager/`) wraps `Memory` for use by agents — it injects `OperationContext`, defaults to an in-memory adapter when none supplied, and runs background persistence.

## Working Memory

Short-term scratchpad keyed by `{ scope, conversationId?, userId }`. Scope is `"conversation"` (per-conversation) or `"user"` (across user). Update modes: `"replace"` (default) or `"append"`.

```ts
await memory.updateWorkingMemory({
  conversationId,
  userId,
  content: "User prefers brief responses",
  mode: "replace",
});
```

## Boundaries

**Allowed without asking**

- Adding optional fields to types.
- Adding new optional adapter methods (with default implementations).
- New convenience query methods.
- Internal Memory orchestration changes that preserve public behavior.

**Ask first**

- Adding required fields to `ConversationStepRecord` / `WorkflowStateEntry`.
- Restructuring `getMessages()` options.
- Changing cache invalidation or embedding batch behavior.
- Changing default merge strategies.

**Never without explicit ask**

- Changing `StorageAdapter` / `VectorAdapter` / `EmbeddingAdapter` method signatures.
- Breaking `UIMessage` / `Conversation` shape.
- Adding platform-specific code (SQL, HTTP) to core.
- Removing default in-memory adapter behavior.

## Tests

```bash
pnpm --dir packages/core test:single -- src/memory/index.spec-d.ts
pnpm --dir packages/core test:single -- src/memory/semantic-search.spec.ts
pnpm --dir packages/core test:single -- src/memory/working-memory.spec.ts
pnpm --dir packages/core typecheck
```

When changing adapter contracts, run the matching adapter package tests too (e.g., `pnpm --dir packages/postgres test`).

## Related

- Parents: [`../../AGENTS.md`](../../AGENTS.md) (package), [`../../../../AGENTS.md`](../../../../AGENTS.md) (repo)
- Siblings: [`../agent/AGENTS.md`](../agent/AGENTS.md), [`../workflow/AGENTS.md`](../workflow/AGENTS.md), [`../workspace/AGENTS.md`](../workspace/AGENTS.md), [`../voltops/AGENTS.md`](../voltops/AGENTS.md), [`../tool/AGENTS.md`](../tool/AGENTS.md), [`../observability/AGENTS.md`](../observability/AGENTS.md), [`../mcp/AGENTS.md`](../mcp/AGENTS.md), [`../a2a/AGENTS.md`](../a2a/AGENTS.md)
- External adapter packages: `packages/postgres`, `packages/libsql`, `packages/supabase`, `packages/cloudflare-d1`, `packages/voltagent-memory`
