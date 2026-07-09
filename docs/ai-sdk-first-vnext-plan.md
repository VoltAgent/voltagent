# AI SDK First vNext Plan

Status: draft  
Related issue: https://github.com/VoltAgent/voltagent/issues/1373

## Goal

Make VoltAgent vNext feel native to AI SDK users at the public boundary while preserving the orchestration features that make VoltAgent a framework.

The target principle:

> AI SDK-native at the boundary, VoltAgent-native in orchestration.

This means AI SDK primitives such as `model`, `prompt`, `messages`, `tools`, `output`, `stopWhen`, `providerOptions`, and stream responses should be the default mental model. VoltAgent-specific capabilities such as memory, subagents, workflows, observability, guardrails, middleware, tool routing, feedback, evals, MCP, A2A, AG-UI, and VoltOps must remain first-class.

## Non-Goals

- Do not flatten VoltAgent into a thin `ai` package wrapper.
- Do not remove current public APIs until compatibility wrappers, tests, docs, and codemods exist.
- Do not remove `generateObject` or `streamObject` in the first migration step. They should become deprecated wrappers first.
- Do not lose the `provider/model` router experience without an explicit replacement.
- Do not change stream event semantics without updating server, AG-UI, MCP, A2A, resumable streams, and docs together.
- Do not preserve CommonJS runtime compatibility in vNext after the AI SDK 7 upgrade. AI SDK 7 is ESM-only, so vNext should be ESM-only instead of adding a fragile CJS bridge.

## vNext Platform Decision

Decision: VoltAgent vNext will target AI SDK 7, Node.js 22 or later, and ESM-only package output.

This is an explicit compatibility boundary:

- Set the repository and published package engine requirement to `node >=22`.
- Remove CommonJS runtime exports from vNext packages that depend on AI SDK or packages that depend on those packages.
- Prefer `"type": "module"` and ESM package exports for new vNext package metadata.
- Keep TypeScript declaration output for ESM consumers.
- Treat CommonJS support as a previous-major compatibility concern, not a vNext requirement.

Rationale:

- AI SDK 7 requires Node.js 22 or later.
- AI SDK 7 packages are ESM-only and no longer support `require()`.
- VoltAgent core, server, memory, scorer, and protocol packages import AI SDK types and runtime helpers throughout the public surface.
- Keeping CJS exports while depending on ESM-only AI SDK packages would create runtime paths that compile but fail for CommonJS users.

Migration consequence:

- Users on Node.js 20 must stay on the previous VoltAgent major or upgrade Node before adopting vNext.
- Users using `require("@voltagent/core")` must migrate to ESM imports.
- Docs, examples, package exports, and migration guide must call this out clearly.

## Protected Feature Surface

These features need parity tests before major refactors.

| Area              | Protected behavior                                                                                                                      | Key files                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Agent calls       | `generateText(input, options)`, `streamText(input, options)`, object output, hooks, feedback, abort, usage, finish reason               | `packages/core/src/agent/agent.ts`, `packages/core/src/agent/types.ts`                 |
| Tools             | VoltAgent tools, AI SDK tools, provider tools, client-side tools, toolkits, `needsApproval`, `toModelOutput`, output schema, tool hooks | `packages/core/src/tool`, `packages/core/src/tool/manager`                             |
| Tool routing      | Pool/expose/search/call tools, embedding search, `enforceSearchBeforeCall`                                                              | `packages/core/src/tool/routing`                                                       |
| Subagents         | `delegate_task`, supervisor prompt, parallel handoff, stream metadata, bail, parent context propagation                                 | `packages/core/src/agent/subagent`                                                     |
| Memory V2         | recent history, semantic memory, working memory, conversation steps, message metadata persistence, title generation                     | `packages/core/src/memory`, `packages/core/src/agent/memory-persist-queue.ts`          |
| Guardrails        | input block/rewrite, output block/rewrite, streaming redaction, speculative input guardrails                                            | `packages/core/src/agent/guardrail.ts`, `packages/core/src/agent/streaming`            |
| Middleware        | input/output middleware, abort, retry, retry hooks                                                                                      | `packages/core/src/agent/middleware.ts`                                                |
| Observability     | root/child spans, tool/memory/retriever/embedding/guardrail/middleware/llm spans, VoltOps sync, logs, feedback                          | `packages/core/src/agent/open-telemetry`, `packages/core/src/observability`            |
| Evals             | live eval payloads, tool calls/results, subagent metadata, scorer spans, VoltOps result sync                                            | `packages/core/src/agent/eval.ts`, `packages/core/src/eval`, `packages/scorers`        |
| Workflows         | `andAgent`, typed output, usage aggregation, suspend/resume/replay, workflow state persistence, stream attach                           | `packages/core/src/workflow`, `packages/server-core/src/handlers/workflow.handlers.ts` |
| Server adapters   | REST/SSE, UI message streams, resumable streams, serverless, Hono routes                                                                | `packages/server-core`, `packages/server-hono`, `packages/resumable-streams`           |
| Protocol adapters | MCP agent/tool/workflow exposure, A2A send/stream/cancel, AG-UI event mapping                                                           | `packages/mcp-server`, `packages/a2a-server`, `packages/ag-ui`                         |
| Model routing     | direct AI SDK models, dynamic model values, fallback arrays, retries, provider/model strings, embedding model strings                   | `packages/core/src/registries/model-provider-registry.ts`                              |
| Workspace         | filesystem, sandbox, search, skills, prompt hook injection, workspace tool policies                                                     | `packages/core/src/workspace`                                                          |
| PlanAgent         | planning toolkit, task tool, ephemeral subagents, filesystem/tool result eviction                                                       | `packages/core/src/planagent`                                                          |

## Proposed Public API Direction

### Object-style calls

Add object-style overloads while preserving current calls:

```ts
await agent.generateText({
  prompt: "Summarize this",
  model,
  tools,
  output,
  stopWhen,
  providerOptions,
  voltagent: {
    userId,
    conversationId,
    memory,
    guardrails,
    middleware,
    toolRouting,
    feedback,
    parentSpan,
  },
});
```

Existing usage must still work:

```ts
await agent.generateText("Summarize this", {
  userId,
  conversationId,
  output,
});
```

### Namespacing rule

Keep AI SDK-compatible fields top-level. Move VoltAgent runtime concerns into `voltagent` in the new object-style API.

Initial compatibility should accept both:

```ts
await agent.generateText({
  prompt: "Hello",
  conversationId: "legacy-compatible",
});

await agent.generateText({
  prompt: "Hello",
  voltagent: {
    conversationId: "preferred-vnext",
  },
});
```

If both are supplied, `voltagent.*` should win and a dev-time deprecation warning can be emitted later.

## Step-by-Step Implementation Plan

### Phase 0: Baseline and Feature Parity Tests

Objective: lock current behavior before changing API shape.

1. Create a parity tracking issue or checklist.
2. Add focused tests for the protected feature surface.
3. Prefer narrow tests around public behavior instead of snapshotting internals.
4. Add type tests for overload compatibility.
5. Run package-level tests before each refactor slice.

Suggested test additions:

- `packages/core/src/agent/agent.spec.ts`
  - object output still works through `generateText` with `output`.
  - current positional API remains unchanged.
  - `onStepEnd`, `onRetry`, `onFallback`, `onEnd`, and `onError` still fire.
  - abort and bail do not become retry/fallback candidates.
- `packages/core/src/agent/agent.spec-d.ts`
  - positional API type compatibility.
  - new object-style API type inference.
  - `output: Output.object(...)` result inference.
- `packages/core/src/tool/manager/ToolManager.spec.ts`
  - VoltAgent tool to AI SDK tool conversion.
  - provider tools pass through.
  - client-side tools omit `execute`.
  - `needsApproval`, `toModelOutput`, and `outputSchema` are preserved.
- `packages/core/src/agent/subagent/*.spec.ts`
  - `delegate_task` injection.
  - parallel handoff.
  - bail returns subagent result without supervisor post-processing.
  - subagent stream metadata is forwarded.
- `packages/core/src/memory/*.spec.ts`
  - conversation messages and conversation steps persist.
  - semantic memory merge behavior.
  - working memory read/update/clear tools.
- `packages/core/src/agent/guardrail*.spec.ts`
  - input block/rewrite.
  - output block/rewrite.
  - streaming redaction across chunk boundaries.
- `packages/server-core/src/handlers/agent.handlers.spec.ts`
  - REST generate.
  - raw fullStream SSE.
  - UI message stream response.
  - resumable stream setup and resume.
- `packages/mcp-server`, `packages/a2a-server`, `packages/ag-ui`
  - adapters still compile and consume the same result contracts.
- `packages/core/src/workflow/*`
  - `andAgent` typed output.
  - workflow usage aggregation.
  - suspend/resume/replay state persistence.

Exit criteria:

- Parity tests cover all high-risk surfaces.
- Existing public API tests pass.
- Type tests cover old and new intended signatures.

Validation commands:

```bash
pnpm test --filter @voltagent/core
pnpm test --filter @voltagent/server-core
pnpm test --filter @voltagent/mcp-server
pnpm test --filter @voltagent/a2a-server
pnpm test --filter @voltagent/ag-ui
pnpm lint
```

Progress:

- [x] Added core Agent parity coverage for successful `generateText` structured output with `Output.object`.
- [x] Added type coverage for `generateText` structured output inference.
- [x] Added explicit positional API compatibility tests before object-style overloads.
- [x] Added tool manager parity tests for provider/client-side/approval/output conversion.
- [x] Added focused subagent stream metadata and bail parity tests.
- [x] Added memory step persistence and working memory parity tests.
- [x] Added server/protocol adapter stream contract tests.

### Phase 1: Add Agent Request Normalization

Objective: introduce the new API shape without changing behavior.

1. Add new request types near the current Agent generation options.
2. Add a small normalization helper that converts both call styles into the existing internal shape.
3. Keep the current execution pipeline intact.
4. Do not change stream events in this phase.

Proposed types:

```ts
type VoltAgentRuntimeOptions = {
  userId?: string;
  conversationId?: string;
  memory?: RuntimeMemoryConfig;
  guardrails?: RuntimeGuardrailConfig;
  middleware?: RuntimeMiddlewareConfig;
  toolRouting?: ToolRoutingConfig | false;
  feedback?: AgentFeedbackOptions | boolean;
  parentSpan?: Span;
  parentAgentId?: string;
  context?: Map<string | symbol, unknown> | Record<string, unknown>;
};

type AgentGenerateTextRequest = {
  prompt?: string;
  messages?: UIMessage[] | ModelMessage[];
  model?: AgentModelValue;
  tools?: ToolSet | Array<Tool | Toolkit | VercelTool>;
  output?: Output.Output<unknown, unknown>;
  stopWhen?: StopCondition<ToolSet> | StopCondition<ToolSet>[];
  providerOptions?: ProviderOptions;
  voltagent?: VoltAgentRuntimeOptions;
} & Partial<CallSettings>;
```

Implementation notes:

- Normalize `prompt` and `messages` into the existing `input`.
- Normalize `voltagent.context` into `OperationContext.context`.
- Keep legacy top-level VoltAgent options for compatibility.
- Prefer `request.voltagent.*` over legacy top-level equivalents.
- Avoid changing `BaseGenerationOptions` semantics until tests are green.

Candidate files:

- `packages/core/src/agent/agent.ts`
- `packages/core/src/agent/types.ts`
- possibly `packages/core/src/agent/generation-normalizer.ts`

Exit criteria:

- New object-style calls work.
- Old positional calls work.
- No behavior changes in server/MCP/A2A/AG-UI packages.

Progress:

- [x] Added object-style `generateText` and `streamText` request types.
- [x] Added a shared normalizer for `{ prompt | messages, options, ...overrides }`.
- [x] Kept positional calls on the existing execution pipeline.
- [x] Added runtime coverage for object-style request normalization.
- [x] Added type coverage for object-style `generateText` structured output inference and `streamText` return types.
- [x] Added A2A, MCP, and AG-UI adapter contract tests to keep protocol calls positional.

### Phase 2: Unify Structured Output Around AI SDK `output`

Objective: make `generateText` and `streamText` the primary structured-output path.

1. Ensure `generateText({ output: Output.object(...) })` is fully typed and documented.
2. Convert internal scorer usage from `generateObject(prompt, schema)` to `generateText({ prompt, output })`.
3. Convert server object endpoints internally to `output` while preserving endpoint behavior.
4. Keep `generateObject` and `streamObject` as deprecated wrappers.
5. Add deprecation docs and examples.

Candidate files:

- `packages/core/src/agent/agent.ts`
- `packages/server-core/src/handlers/agent.handlers.ts`
- `packages/scorers/src/llm/*.ts`
- `website/docs/agents/overview.md`

Exit criteria:

- `generateObject` and `streamObject` are compatibility wrappers.
- All internal packages use `output` where possible.
- Existing object endpoint responses remain stable.

Progress:

- [x] Routed `generateObject` internally through AI SDK `generateText` with `Output.object`.
- [x] Converted LLM scorers from `generateObject(prompt, schema)` to `generateText({ prompt, output })`.
- [x] Updated scorer test helpers for AI SDK v3 provider response normalization.
- [x] Converted server object endpoint internally to `generateText(input, { output })`.
- [x] Expanded core and server `streamObject` contract tests before stream refactor.
- [x] Converted `streamObject` internally to `streamText({ output: Output.object(...) })` while preserving the deprecated public wrapper.

### Phase 3: Preserve and Clarify VoltAgent Runtime Options

Objective: keep orchestration options explicit in the new API.

1. Add `voltagent` namespace support for runtime options.
2. Keep legacy options as aliases.
3. Add runtime warnings only after docs and codemods exist.
4. Update `processAgentOptions` in server-core to accept both shapes.
5. Update OpenAPI schemas for new object-style payloads.

Candidate fields for `voltagent`:

- `userId`
- `conversationId`
- `context`
- `memory`
- `conversationPersistence`
- `messageMetadataPersistence`
- `semanticMemory`
- `guardrails`
- `middleware`
- `toolRouting`
- `feedback`
- `parentSpan`
- `parentAgentId`
- `requestHeaders`
- `resumableStream`

Exit criteria:

- New namespaced options work in core and server-core.
- Legacy options still work.
- Server request body schemas accept both during transition.

Progress:

- [x] Added core `voltagent` namespace types for runtime options.
- [x] Normalized `voltagent.*` into existing runtime options with `voltagent` taking precedence over legacy top-level fields.
- [x] Prevented VoltAgent-only runtime fields from leaking into AI SDK call options.
- [x] Updated server-core `processAgentOptions` and stream resumable handling to accept normalized `voltagent` options.
- [x] Added OpenAPI schema coverage for `options.voltagent`.
- [x] Added docs examples and migration notes for `voltagent` namespace.
- [ ] Add runtime warnings after docs and codemods exist.

### Phase 4: Internal AI SDK First Execution Cleanup

Objective: simplify internals around AI SDK primitives without losing VoltAgent orchestration.

1. Keep `prepareExecution` as the main orchestration boundary.
2. Separate AI SDK call construction from VoltAgent runtime preparation.
3. Ensure AI SDK options are passed through only after removing VoltAgent-specific fields.
4. Keep VoltAgent retry/fallback in control by continuing to set AI SDK `maxRetries: 0` where needed.
5. Keep `createStepHandler`, step persistence, eval payload building, and trace updates intact.

Important constraints:

- Do not delegate retry/fallback fully to AI SDK unless `onRetry`, `onFallback`, span semantics, and model arrays are preserved.
- Do not replace VoltAgent stream wrappers unless guardrails, subagent metadata, server streams, and AG-UI mappings stay stable.
- Do not bypass `prepareTools`, tool hooks, or tool routing.

Exit criteria:

- Internal code is easier to reason about.
- Public behavior remains unchanged.
- Parity tests remain green.

Progress:

- [x] Extracted AI SDK call option normalization so VoltAgent runtime fields are stripped in one place before `generateText`/`streamText` calls.

### Phase 5: Provider Dependency Decoupling (Deferred)

Decision: defer provider dependency decoupling out of the current AI SDK-first vNext scope.
For this plan, keep existing `provider/model` string resolution and current provider dependency behavior
unchanged.

Rationale:

- `model: "openai/gpt-..."` is widely used across docs, examples, and templates.
- Moving the router or provider dependencies changes installation and migration behavior.
- The current vNext work is already focused on AI SDK-first execution, `output`, and runtime option compatibility.
- Provider decoupling should be handled as a separate proposal with its own migration plan.

Future follow-up, not in this scope:

- Revisit whether model router should remain in core or move to an optional package.
- Preserve string model and embedding resolution if the split happens later.
- Update `create-voltagent-app`, docs, and examples only as part of that separate effort.

### Phase 6: Ecosystem Package Updates

Objective: update all dependent packages to the new compatibility layer.

Packages to verify:

- `packages/server-core`
- `packages/server-hono`
- `packages/mcp-server`
- `packages/a2a-server`
- `packages/ag-ui`
- `packages/resumable-streams`
- `packages/scorers`
- `packages/evals`
- `packages/create-voltagent-app`
- `packages/cli`
- examples under `examples/`
- docs under `website/docs`

Required checks:

- Server routes accept old and new payloads.
- `toUIMessageStreamResponse` still works.
- Raw `fullStream` SSE remains stable.
- MCP agent/tool/workflow adapters still expose useful schemas.
- A2A streaming still emits task updates.
- AG-UI still maps stream events to UI events.
- Resumable stream helpers still persist and resume UI message streams.

Exit criteria:

- All first-party packages compile.
- All affected package tests pass.
- Examples are updated or compatibility-tested.

Progress:

- [x] Verified `packages/ag-ui`, `packages/a2a-server`, `packages/mcp-server`, `packages/server-core`, `packages/scorers`, `packages/evals`, and `packages/create-voltagent-app` with targeted tests.
- [x] Fixed `packages/resumable-streams` chat handler types so they no longer depend on `Agent.streamText` overload inference.
- [x] Added a local `packages/resumable-streams` Vitest config so its package test command exits cleanly when no tests are present.
- [x] Verified `packages/server-hono` with runtime tests, typecheck, build, and route typing boundary cleanup.
- [x] Verified `packages/cli` with test and build.
- [x] Verified website docs with a production build.
- [x] Scanned examples for affected Agent API calls; no updates required for legacy-compatible wrapper usage.

### Phase 7: Documentation, Codemods, and Migration Guide

Objective: make the transition understandable and low-risk.

Docs to add/update:

- vNext migration guide.
- Agent overview with object-style calls.
- Tools guide showing AI SDK tools and VoltAgent tools together.
- Structured output guide using `output`.
- Memory guide showing `voltagent.memory`.
- Subagents guide confirming unchanged orchestration behavior.
- Server API docs showing old/new request body compatibility.
- Provider/model router migration guide.

Codemods to consider:

1. Convert `agent.generateText(input, options)` to `agent.generateText({ prompt: input, ...options })` where safe.
2. Convert `generateObject(input, schema, options)` to `generateText({ prompt: input, output: Output.object({ schema }), ...options })`.
3. Move legacy runtime options into `voltagent`.
4. Rewrite provider imports if provider packages are decoupled.

Exit criteria:

- Migration guide includes before/after examples.
- Executable codemods are optional; documented migration recipes are available for common cases.
- Deprecated APIs have clear removal timeline.

Progress:

- [x] Expanded the 1.x to 2.x migration guide with object-style Agent calls, `options.voltagent`, and `output`-based structured generation examples.
- [x] Added a dedicated structured output guide using `generateText`/`streamText` with AI SDK `Output`.
- [x] Updated Agent overview examples for object-style structured output and `voltagent.memory`.
- [x] Updated memory docs to show `voltagent.memory` for per-call user/conversation scope.
- [x] Updated tools docs to show VoltAgent tools alongside AI SDK provider-defined tools.
- [x] Updated server API docs to prefer `options.voltagent.memory` while documenting legacy compatibility.
- [x] Added sub-agent compatibility guidance confirming orchestration behavior is unchanged.
- [x] Added model router migration note confirming `provider/model` strings remain in scope.
- [x] Deferred executable codemods for this slice because the repo has no existing codemod infrastructure; use documented migration recipes for the first beta and revisit a CLI codemod command separately.

### Phase 8: Release Gates

Objective: ship vNext safely.

Required before beta:

- Core parity suite green.
- Dependent packages green.
- Docs for new API available.
- Deprecation warnings reviewed.
- Provider router story decided.
- No known server/MCP/A2A/AG-UI stream regressions.

Required before stable:

- `pnpm test:all`
- `pnpm build:all`
- `pnpm lint`
- package publint checks where relevant.
- migration guide published.
- examples updated.

Progress:

- [x] `pnpm lint` exits successfully. Existing warnings remain for the broken `examples/with-workspace/skills/playwright-cli` symlink and pre-existing complexity warnings.
- [x] `pnpm build:all` succeeds for all 29 build targets.
- [x] Website production build succeeds with existing tweet/private route/browserslist warnings.
- [x] Added local Vitest configs for `packages/cloudflare-d1` and `packages/voltagent-memory`; targeted package tests now exit cleanly.
- [x] Verified `packages/sandbox-blaxel` directly and through `pnpm test:all`.
- [x] Updated stale `packages/server-elysia` provider tests to mock the Node HTTP server path instead of Elysia's Bun-oriented `app.listen`.
- [x] `pnpm test:all` succeeds for all 26 test targets.
- [x] `pnpm publint:all` succeeds for all 14 publint targets, with existing package metadata suggestions only.

### Phase 9: AI SDK 7, Node 22, and ESM-only Runtime

Objective: upgrade VoltAgent vNext to AI SDK 7 while making the runtime boundary explicit: Node.js 22 or later and ESM-only package output.

Reference:

- Official AI SDK 7 migration guide: https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0

Key upstream changes to account for:

- AI SDK 7 requires Node.js 22 or later.
- AI SDK 7 packages are ESM-only.
- `ai` moves to `^7`.
- `@ai-sdk/provider` moves to `^4`.
- `@ai-sdk/provider-utils` moves to `^5`.
- `@ai-sdk/react` moves to `^4`.
- Most provider packages move to a new major, but not all providers share the same major number.
- `CallSettings` is replaced by `LanguageModelCallOptions` plus request option types.
- `stepCountIs` is renamed to `isStepCount`.
- `streamText` result access changes from `fullStream` to `stream`.
- AI SDK lifecycle callbacks use `onEnd` and `onStepEnd` instead of `onFinish` and `onStepFinish`.
- AI SDK tool execution callbacks and tool context names changed.
- Deprecated structured output fields such as `experimental_output` are removed.
- Usage result shapes changed; final-step fields moved under `finalStep` for multi-step results.

#### 9.1 Package and Runtime Boundary

1. Update root `package.json` engines from `node >=20` to `node >=22`.
2. Update package-level engines if any package declares its own Node range.
3. Convert vNext published packages to ESM-only output where they directly or indirectly rely on AI SDK.
4. Remove or stop advertising `require` exports for vNext package entrypoints.
5. Add `"type": "module"` where package metadata needs it for ESM-only output.
6. Keep `.d.ts` declarations and ESM `types` exports stable for TypeScript users.
7. Review `tsup.config.ts` files and remove `cjs` from `format` for affected packages.
8. Keep package source TypeScript as `NodeNext`/ESM-compatible.

Primary packages to update:

- `packages/core`
- `packages/server-core`
- `packages/server-hono`
- `packages/server-elysia`
- `packages/serverless-hono`
- `packages/resumable-streams`
- `packages/scorers`
- `packages/ag-ui`
- `packages/a2a-server`
- `packages/mcp-server`
- memory packages that expose `UIMessage` types:
  - `packages/libsql`
  - `packages/postgres`
  - `packages/supabase`
  - `packages/cloudflare-d1`
  - `packages/voltagent-memory`
- packages that build against `@voltagent/core` public types:
  - `packages/evals`
  - `packages/cli`
  - `packages/create-voltagent-app`
  - `packages/docs-mcp`

Exit criteria:

- No vNext package that depends on AI SDK publishes a CommonJS runtime export.
- `pnpm build:all` produces ESM artifacts and TypeScript declarations.
- `pnpm publint:all` passes against the new export maps.

#### 9.2 Dependency Upgrade

1. Update all first-party `package.json` files that depend on `ai` from `^6.0.0` to `^7.0.0`.
2. Update `@ai-sdk/provider-utils` peer/dev ranges from `4.x` or `^4.0.0` to `^5.0.0`.
3. Add or update `@ai-sdk/provider` ranges to `^4.0.0` where packages reference provider-level types directly.
4. Update first-party provider dependencies in `packages/core`:

| Package                     | Current family | v7-compatible family |
| --------------------------- | -------------- | -------------------- |
| `@ai-sdk/amazon-bedrock`    | `^3`           | `^5`                 |
| `@ai-sdk/anthropic`         | `^3`           | `^4`                 |
| `@ai-sdk/azure`             | `^3`           | `^4`                 |
| `@ai-sdk/cerebras`          | `^2`           | `^3`                 |
| `@ai-sdk/cohere`            | `^3`           | `^4`                 |
| `@ai-sdk/deepinfra`         | `^2`           | `^3`                 |
| `@ai-sdk/gateway`           | `^3`           | `^4`                 |
| `@ai-sdk/google`            | `^3`           | `^4`                 |
| `@ai-sdk/google-vertex`     | `^3`           | `^5`                 |
| `@ai-sdk/groq`              | `^3`           | `^4`                 |
| `@ai-sdk/mistral`           | `^3`           | `^4`                 |
| `@ai-sdk/openai`            | `^3`           | `^4`                 |
| `@ai-sdk/openai-compatible` | `^2`           | `^3`                 |
| `@ai-sdk/perplexity`        | `^3`           | `^4`                 |
| `@ai-sdk/togetherai`        | `^2`           | `^3`                 |
| `@ai-sdk/vercel`            | `^2`           | `^3`                 |
| `@ai-sdk/xai`               | `^3`           | `^4`                 |

5. Update examples using `@ai-sdk/openai` from `^3` to `^4`.
6. Update examples using `@ai-sdk/react` from `^3` to `^4`.
7. Run `pnpm install --lockfile-only --no-frozen-lockfile` after package updates.
8. Check third-party provider compatibility:
   - `ollama-ai-provider-v2`
   - `workers-ai-provider`
   - `@aihubmix/ai-sdk-provider`
   - `@gitlab/gitlab-ai-provider`
   - `@mymediset/sap-ai-provider`

Exit criteria:

- The lockfile resolves AI SDK 7 and provider v7-compatible packages consistently.
- No first-party package keeps an `ai@^6` peer or dev dependency unless explicitly documented as previous-major-only.
- Third-party provider incompatibilities are documented or isolated.

#### 9.3 Run AI SDK v7 Codemods

1. Run the official codemod on source packages first:

```bash
npx @ai-sdk/codemod v7 packages/core/src packages/server-core/src packages/resumable-streams/src packages/scorers/src
```

2. Run it on protocol and server adapters:

```bash
npx @ai-sdk/codemod v7 packages/ag-ui/src packages/a2a-server/src packages/mcp-server/src packages/server-hono/src packages/server-elysia/src
```

3. Run it on examples only after core package builds:

```bash
npx @ai-sdk/codemod v7 examples
```

4. Review every codemod diff manually. Do not accept broad semantic rewrites without checking VoltAgent compatibility.
5. Avoid running codemods over generated files, changelogs, archived deprecated package docs, or built artifacts.

Exit criteria:

- Codemod changes are reviewed and scoped.
- No generated or historical changelog content is accidentally rewritten.

#### 9.4 Core Compatibility Layer

Objective: move VoltAgent's AI SDK-facing public API to v7 names while keeping existing VoltAgent runtime behavior intact.

1. Replace AI SDK `CallSettings` usage with the new v7 call option types.
2. Use AI SDK 7 callback names on the public Agent surface:
   - `hooks.onStepEnd`
   - `onEnd` for AI SDK stream/UI callbacks
   - keep `needsApproval` on VoltAgent tools for backward compatibility
3. Pass AI SDK 7 callback names through at the AI SDK call boundary:
   - VoltAgent `onStepEnd` → AI SDK `onStepEnd`
   - VoltAgent stream `onEnd` → AI SDK `onEnd`
4. Replace internal `stepCountIs` imports and exports with `isStepCount`.
5. Export `isStepCount`; do not keep a public `stepCountIs` alias for vNext.
6. Adapt `fullStream` handling:
   - internally consume AI SDK `stream`
   - expose VoltAgent `stream` as the primary detailed event stream
   - keep a deprecated `fullStream` alias only where it is low-cost during the transition
   - keep server raw-stream endpoint semantics stable while consuming `stream`
7. Adapt result shape reads:
   - inspect `usage`, `finishReason`, `text`, `toolCalls`, `toolResults`, and `steps`
   - use `finalStep` where AI SDK v7 moves final-step-only fields
8. Remove any remaining `experimental_output` handling from active code paths.
9. Review tool execution options:
   - update `ToolExecutionOptions` imports from provider-utils v5
   - map VoltAgent `needsApproval` to AI SDK 7 tool approval semantics where raw AI SDK tools are passed through
   - keep VoltAgent tool approval behavior stable for existing users
10. Review tool context:
    - replace AI SDK `experimental_context` assumptions with v7 `context`/`runtimeContext` semantics
    - keep VoltAgent `OperationContext` separate from AI SDK runtime context
11. Update Google provider type names:
    - replace `GoogleGenerativeAIProviderOptions` with v7-compatible Google provider option names
    - update model provider registry builder names if provider exports changed

Candidate files:

- `packages/core/src/agent/agent.ts`
- `packages/core/src/agent/types.ts`
- `packages/core/src/agent/providers/base/types.ts`
- `packages/core/src/tool/index.ts`
- `packages/core/src/tool/manager/ToolManager.ts`
- `packages/core/src/workspace/tool-policy.ts`
- `packages/core/src/index.ts`
- `packages/core/src/registries/model-provider-registry.ts`
- `packages/core/src/registries/model-provider-registry.generated.ts`
- `packages/core/src/utils/usage-normalizer.ts`
- `packages/core/src/utils/usage-converter.ts`
- `packages/core/src/utils/message-converter.ts`

Exit criteria:

- Core typecheck passes.
- Core runtime tests pass.
- Public VoltAgent compatibility tests for `fullStream`, hooks, structured output, tool approval, and usage pass.

#### 9.4.1 AI SDK-Style ToolSet Support

Objective: support the user's requested direct AI SDK `tool()` usage while preserving VoltAgent-only tool features.

Public API direction:

```ts
import { tool } from "@voltagent/core";

const agent = new Agent({
  name: "assistant",
  model,
  instructions: "You are a helpful assistant.",
  tools: {
    get_weather: tool({
      description: "Get weather for a city",
      inputSchema: z.object({
        city: z.string(),
      }),
      execute: async ({ city }) => ({ city, temperature: 72 }),
      voltagent: {
        tags: ["weather"],
        needsApproval: true,
        hooks: {
          onStart: async ({ args }) => {
            console.log(args);
          },
        },
      },
    }),
  },
});
```

Implementation plan:

1. Re-export an AI SDK-compatible `tool()` helper from `@voltagent/core`.
2. Keep the returned value a regular AI SDK tool so it can be used anywhere AI SDK expects a tool.
3. Store `voltagent` metadata out-of-band so it is not passed to model providers.
4. Accept `ToolSet` records in `AgentOptions.tools`, dynamic tools, and per-call tools.
5. Let ToolSet object keys provide tool names, matching AI SDK conventions.
6. Preserve VoltAgent features for AI SDK tools:
   - `voltagent.tags`
   - `voltagent.needsApproval`
   - `voltagent.hooks`
   - `outputSchema`
   - `providerOptions`
   - `toModelOutput`
   - observability spans
   - agent-level `onToolStart`, `onToolEnd`, and `onToolError`
7. Keep existing `createTool` working as a compatibility API.
8. Update tool routing and API exposure to understand named AI SDK tools.
9. Add focused tests for ToolManager preparation and Agent hook execution.
10. Document migration from `createTool({ name, parameters })` to `tool({ inputSchema })` inside a ToolSet.
11. Support AI SDK v7 native call-level `toolApproval` and pass it through to `generateText`/`streamText`.
12. Let tool routing read the same `toolApproval` policy before executing hidden pool tools through `callTool`.

Exit criteria:

- `tools: { name: tool(...) }` works on `new Agent(...)`.
- Runtime and dynamic tools accept both arrays of VoltAgent tools and AI SDK `ToolSet` records.
- Tool hooks, agent hooks, tags, approval metadata, and output validation are preserved.
- Native `toolApproval` works for normal AI SDK tool execution and is enforced for tool routing pool calls.
- Existing `createTool` tests keep passing.
- Migration guide explains the new preferred tool style.

#### 9.5 Server, Protocol, and Ecosystem Compatibility

1. Update server raw stream handling to consume VoltAgent-compatible `fullStream` or the new AI SDK `stream` wrapper.
2. Keep REST and SSE response semantics stable.
3. Verify UI message stream helpers still work in server-core and resumable streams.
4. Update AG-UI to consume the stream alias without depending on removed AI SDK fields.
5. Update A2A and MCP tests to compile against the new core result contracts.
6. Update scorers to keep using `generateText({ output })`.
7. Update memory packages that import `UIMessage` types.
8. Update e2e message persistence tests for AI SDK v7 message part shape changes.

Candidate files:

- `packages/server-core/src/handlers/agent.handlers.ts`
- `packages/server-core/src/utils/options.ts`
- `packages/server-core/src/schemas/agent.schemas.ts`
- `packages/resumable-streams/src/chat-handlers.ts`
- `packages/ag-ui/src/voltagent-agent.ts`
- `packages/a2a-server/src`
- `packages/mcp-server/src`
- `packages/scorers/src`
- `packages/*/src/*memory*`

Exit criteria:

- Targeted tests pass for server-core, server-hono, server-elysia, AG-UI, A2A, MCP, resumable-streams, scorers, and memory packages.
- Raw SSE, UI message stream, resumable stream, AG-UI, MCP, and A2A contracts remain covered by tests.

#### 9.6 Docs, Examples, and Migration Guide

1. Add a migration guide section for:
   - Node.js 22 minimum
   - ESM-only imports
   - removal of CommonJS `require` support
   - AI SDK 7 package versions
   - `stepCountIs` → `isStepCount`
   - AI SDK `fullStream` → `stream`
   - lifecycle callback rename to `onEnd` / `onStepEnd`
   - tool approval compatibility
2. Update installation snippets:
   - `ai@^7`
   - `@ai-sdk/openai@^4`
   - `@ai-sdk/react@^4` where UI hooks are used
3. Update examples to ESM-only assumptions.
4. Update `create-voltagent-app` templates.
5. Update docs that mention Node.js 20 support.
6. Avoid rewriting old changelog entries except adding a new vNext migration entry.

Candidate files:

- `website/docs/getting-started/migration-guide.md`
- `website/docs/getting-started/model-router.md`
- `website/docs/agents/overview.md`
- `website/docs/agents/structured-output.md`
- `website/docs/api/endpoints/agents.md`
- `packages/create-voltagent-app`
- `examples/*/package.json`

Exit criteria:

- Users can follow the migration guide from VoltAgent 2.x/AI SDK 6 to vNext/AI SDK 7.
- Website build succeeds.

#### 9.7 Validation Gates for AI SDK 7

Run these after the v7 migration work, even though Phase 8 was already green before this new scope:

```bash
pnpm lint
pnpm build:all
pnpm test:all
pnpm publint:all
pnpm --dir website build
```

Additional targeted checks:

```bash
pnpm --filter @voltagent/core typecheck
pnpm --filter @voltagent/core test
pnpm --filter @voltagent/server-core typecheck
pnpm --filter @voltagent/server-core test
pnpm --filter @voltagent/server-hono typecheck
pnpm --filter @voltagent/server-hono test
pnpm --filter @voltagent/server-elysia test
pnpm --filter @voltagent/ag-ui test
pnpm --filter @voltagent/a2a-server test
pnpm --filter @voltagent/mcp-server test
pnpm --filter @voltagent/resumable-streams test
pnpm --filter @voltagent/scorers test
```

Progress:

- [x] Decision made: vNext targets Node.js `>=22` and ESM-only.
- [x] Package/runtime metadata updated for Node.js 22 and ESM-only.
- [x] AI SDK dependencies upgraded to v7-compatible ranges.
- [x] AI SDK v7 codemods applied and reviewed.
- [x] Core AI SDK boundary updated for v7 call options, stream result shape, callback names, usage shape, and tool approval.
- [x] Added AI SDK-style `tool()` support with a VoltAgent metadata namespace and direct `ToolSet` support.
- [x] Added native AI SDK `toolApproval` pass-through and tool routing policy enforcement.
- [x] Server/protocol/ecosystem packages updated.
- [x] Docs, examples, and templates updated for AI SDK 7, Node.js 22, and ESM-only.
- [x] `pnpm --filter @voltagent/core typecheck` passes.
- [x] `pnpm --filter @voltagent/core test` passes.
- [x] `pnpm build:all` passes.
- [x] `pnpm lint` passes with existing warnings only.
- [ ] Remaining release gates: `pnpm test:all`, `pnpm publint:all`, and `pnpm --dir website build`.
- [ ] AI SDK 7 validation gates pass.

## Suggested PR Slices

1. Parity tests only.
2. Object-style type definitions and request normalizer.
3. Core `generateText` and `streamText` overload support.
4. `output`-first structured generation and deprecated object wrappers.
5. Server-core request/schema compatibility.
6. Scorers/evals migration to `output`.
7. MCP/A2A/AG-UI/resumable verification and fixes.
8. Docs and codemods.
9. Cleanup and deprecation warnings.
10. Node.js 22 and ESM-only package boundary.
11. AI SDK 7 dependency upgrade and codemod review.
12. AI SDK 7 core compatibility layer.
13. AI SDK-style `tool()` and direct `ToolSet` support.
14. AI SDK 7 server/protocol/ecosystem compatibility.
15. AI SDK 7 docs, examples, templates, and release gates.

Each PR should include focused tests and avoid mixing refactors with behavior changes.

## Open Decisions

1. Should the namespace be called `voltagent`, `runtime`, or `metadata`?
   - Current recommendation: `voltagent`, because it is explicit and avoids collisions with AI SDK fields.
2. Should `provider/model` string resolution remain in `@voltagent/core`?
   - Current plan decision: yes. Keep the existing behavior unchanged for this scope; provider dependency decoupling is deferred.
3. Should `generateObject` and `streamObject` be removed in vNext or later?
   - Current recommendation: deprecate in vNext, remove only in a later major.
4. Should stream part metadata remain VoltAgent-extended AI SDK parts or move to custom wrapper events?
   - Current recommendation: keep current semantics until server/AG-UI/MCP/A2A have explicit compatibility layers.
5. How aggressive should codemods be?
   - Current decision: defer executable codemods for this slice. If added later, keep them conservative and add TODO comments for ambiguous cases.
6. Should VoltAgent vNext preserve Node.js 20 support?
   - Current decision: no. AI SDK 7 requires Node.js 22 or later, so vNext requires `node >=22`.
7. Should VoltAgent vNext preserve CommonJS runtime exports?
   - Current decision: no. AI SDK 7 is ESM-only, so vNext should publish ESM-only runtime entrypoints instead of maintaining brittle CommonJS wrappers.

## Risk Register

| Risk                                                             | Impact | Mitigation                                                                                         |
| ---------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| Stream part changes break AG-UI/server/resumable streams         | High   | Add stream contract tests before refactor                                                          |
| AI SDK 7 `stream` rename breaks VoltAgent `fullStream` consumers | High   | Use `stream` in docs/server code and keep a deprecated `fullStream` alias during transition        |
| AI SDK 7 callback renames break hooks                            | High   | Rename public hooks to `onEnd`/`onStepEnd` for vNext and document the breaking change              |
| Tool approval semantics regress during `needsApproval` migration | High   | Preserve VoltAgent tool normalization and map to AI SDK 7 approval semantics in one place          |
| Tool metadata lost when accepting raw AI SDK tools               | High   | Preserve VoltAgent tool normalization and manager APIs                                             |
| Memory step persistence silently regresses                       | High   | Add tests around conversation steps and subagent metadata                                          |
| Guardrail streaming redaction breaks across chunk boundaries     | High   | Keep streaming guardrail tests and runner isolated                                                 |
| Model retry/fallback behavior changes                            | High   | Keep VoltAgent retry loop and add retry/fallback tests                                             |
| CommonJS users break on vNext                                    | High   | Make ESM-only and Node.js 22 requirements explicit in package metadata and migration docs          |
| Package exports or publint fail after removing CJS output        | High   | Update export maps package-by-package and run `pnpm publint:all`                                   |
| Third-party providers are not AI SDK 7 compatible                | Medium | Audit third-party providers, document incompatibilities, and isolate unsupported provider builders |
| Provider dependency decoupling expands scope                     | Medium | Deferred; keep existing router and provider dependency behavior unchanged in this plan             |
| Server request schemas diverge from core API                     | Medium | Update schemas and processAgentOptions in same slice                                               |
| Deprecated wrappers become maintenance burden                    | Medium | Keep wrappers thin and document removal timeline                                                   |
| Docs/examples accidentally show AI SDK 6 or CommonJS patterns    | Medium | Update migration guide, templates, and examples after package migration                            |

## Working Checklist

- [ ] Phase 0 parity tests are merged.
- [ ] Phase 1 object-style request normalizer is merged.
- [ ] Phase 2 structured output uses `output` internally.
- [ ] Phase 3 `voltagent` namespace compatibility is merged.
- [ ] Phase 4 internal execution cleanup is merged.
- [x] Phase 5 provider dependency decoupling is deferred out of this plan.
- [x] Phase 6 ecosystem packages are updated.
- [x] Phase 7 docs are available; executable codemods are deferred to a separate follow-up.
- [x] Phase 8 release gates are green.
- [ ] Phase 9 AI SDK 7, Node.js 22, ESM-only, and AI SDK-style tool support is complete.

## Current Recommendation

Proceed in this order:

1. Protect behavior with tests.
2. Add the new object-style API as a compatibility layer.
3. Move structured output to `output`.
4. Namespace VoltAgent runtime options.
5. Refactor internals after behavior is locked.
6. Keep provider routing unchanged in this scope.
7. Finish docs/codemod decisions and run release gates.
8. Apply the Node.js 22 and ESM-only package boundary.
9. Upgrade AI SDK dependencies to v7-compatible ranges.
10. Run and review AI SDK v7 codemods.
11. Update the core AI SDK boundary for v7 option, stream, callback, usage, and tool approval changes.
12. Add AI SDK-style `tool()` and direct `ToolSet` support while preserving VoltAgent tool features.
13. Update server, protocol, memory, scorer, docs, examples, and templates.
14. Re-run the full release gates for the AI SDK 7 scope.

This order keeps the vNext direction moving while minimizing the chance of losing existing framework features. Phase 8 was green before the AI SDK 7 scope was added; Phase 9 intentionally reopens the release-gate work for the new runtime and dependency boundary.
