# Core Tools

Owns tool definition (`Tool` / `Toolkit`), schema validation (Zod), the tool manager (registration, lookup, execution), tool routing (`searchTools` / `callTool` meta-tools), span tracking, and error normalization. Every agent tool call flows through this directory.

## Critical Rules

- **Parameters schema is mandatory (Zod).** Every tool requires a `z.object(...)` schema. The AI SDK converts to JSON Schema; coercion at execution via `coerceStringifiedJsonToolArgs()`.
- **Tool names must be unique.** Uniqueness is enforced across standalone tools and toolkits in `ToolManager`. Duplicates warn but the last one wins; tool spans collide on duplicates.
- **Span name convention is `tool.execution:<tool.name>`** (created in `agent.ts` via `oc.traceContext.createChildSpan`). Downstream telemetry (Langfuse, Vercel AI exporter, dashboards) parses this prefix — renaming breaks production observability.
- **`safeStringify` for tool args/output in spans.** Import from `@voltagent/internal`. Args/output may contain secrets; never `JSON.stringify` directly into attributes.
- **Errors flow through `buildToolErrorResult()` and `onToolError`.** Tool throws → `onToolError` hook (can override output) → normalized to `{ error: string; ... }` for the LLM.
- **Toolkit `addInstructions: true` merges into the agent system prompt.** Avoids per-tool instruction duplication; respects agent-level instruction overrides.

## Tool Definition

```ts
import { z } from "zod";
import { createTool } from "@voltagent/core";

const calculate = createTool({
  name: "calculate",
  description: "Perform basic arithmetic.",
  parameters: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number(),
    b: z.number(),
  }),
  outputSchema: z.object({
    result: z.number(),
    explanation: z.string(),
  }),
  execute: async ({ operation, a, b }) => {
    const ops = { add: a + b, subtract: a - b, multiply: a * b, divide: a / b };
    return { result: ops[operation], explanation: `${a} ${operation} ${b}` };
  },
});
```

Client-side tools (no `execute`) are exposed to the LLM but not executed server-side.

## Toolkit Grouping

```ts
const fileOps = createToolkit({
  name: "file_operations",
  description: "Read and write files.",
  instructions: "Always check permissions before write operations.",
  addInstructions: true, // merges into the agent's system prompt
  tools: [readFile, writeFile, deleteFile],
});

const agent = new Agent({ tools: [fileOps, calculate] });
```

## Tool Manager & Execution

`ToolManager` handles registration (standalone + toolkits) and prepares tools for the AI SDK. Execution wrap (in `agent.ts` via `createToolExecuteFunction()`):

1. `onToolStart` hook fires.
2. Schema validation + `coerceStringifiedJsonToolArgs()`.
3. Span created (`tool.execution:<name>`); `tool.name` attribute is set on the span.
4. `execute()` runs.
5. `onToolEnd` (success) or `onToolError` (failure) fires.
6. Errors normalized via `buildToolErrorResult()` → returned to the LLM.

## Tool Routing (Search + Call meta-tools)

```ts
const agent = new Agent({
  tools: [tool1, tool2, tool3],
  toolRouting: {
    pool: [tool1, tool2, tool3],
    expose: [tool1, tool2], // LLM only sees these
    embedding: embeddingModel,
    topK: 3,
    enforceSearchBeforeCall: false,
  },
});
```

Two meta-tools (`searchTools`, `callTool`) are auto-injected. The embedding strategy caches tool embeddings; search spans are named `tool.search.embedding:<name>` with cache hit/miss attributes.

## Code Examples

```ts
// Good — set tool.name on the span; serialize structured values with safeStringify
import { safeStringify } from "@voltagent/internal";
span.setAttribute("tool.name", tool.name);
// If you add more attributes, run them through safeStringify first
span.setAttribute("tool.metadata", safeStringify({ retries: 0 }));

// Bad — raw JSON.stringify (may leak structure of secrets)
span.setAttribute("tool.metadata", JSON.stringify(args));

// Bad — no schema (createTool throws)
createTool({ name: "x", description: "x", parameters: undefined, execute: async () => "ok" });
```

## Boundaries

**Allowed without asking**

- Adding focused tool tests.
- Refactoring tool internals.
- New routing strategies.
- Additional `ToolHooks`.
- New client-side tools.

**Ask first**

- Changing `Tool` / `Toolkit` public types.
- Renaming meta-tool names (`searchTools`, `callTool`).
- Modifying span attribute keys.
- Changing error normalization shape.
- Altering schema coercion behavior.

**Never without explicit ask**

- Removing `safeStringify` from telemetry.
- Bypassing `ToolManager` uniqueness checks.
- Swallowing errors before `onToolError` hook fires.
- Removing tool exports from `packages/core/src/index.ts`.

## Tests

```bash
pnpm --dir packages/core test:single -- src/tool/index.spec.ts
pnpm --dir packages/core test:single -- src/tool/manager/index.spec.ts
pnpm --dir packages/core test
pnpm --dir packages/core typecheck
```

## Related

- Parents: [`../../AGENTS.md`](../../AGENTS.md) (package), [`../../../../AGENTS.md`](../../../../AGENTS.md) (repo)
- Siblings: [`../agent/AGENTS.md`](../agent/AGENTS.md), [`../workflow/AGENTS.md`](../workflow/AGENTS.md), [`../memory/AGENTS.md`](../memory/AGENTS.md), [`../workspace/AGENTS.md`](../workspace/AGENTS.md), [`../voltops/AGENTS.md`](../voltops/AGENTS.md), [`../observability/AGENTS.md`](../observability/AGENTS.md), [`../mcp/AGENTS.md`](../mcp/AGENTS.md), [`../a2a/AGENTS.md`](../a2a/AGENTS.md)
- External: `@voltagent/internal` (`safeStringify`)
