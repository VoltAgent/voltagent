# Tool Routing Implementation Plan

This document captures the agreed implementation plan for VoltAgent tool routing with router tools, tool pools, and optional embedding-based selection. We will track execution with Markdown checkboxes.

## Decisions (Locked)

- Tool routing config is supported at both Agent and VoltAgent levels (global default + per-agent override).
- Pool includes user-defined tools, provider-defined tools, and MCP tools.
- Default router execution mode is "agent"; users can override.
- Agent mode uses the same model by default; can be overridden with executionModel.
- Args are generated via generateText with structured output (schema-based output).
- Provider tool selection triggers agent-mode fallback and emits an info log.
- Embedding selection auto-activates when an embedding model or adapter is provided.
- Embedding index uses in-memory cache (extensible later).
- Router executes multiple selected tools in parallel.
- API visibility includes pool tools (not hidden); observability also includes pool tools.
- Tool approvals and hooks (tool hooks + agent onToolStart/onToolEnd) still run for pool tools.

## Scope

- Core API: ToolRoutingConfig, ToolRouterStrategy, ToolRouter, execution modes.
- Agent runtime: tool pool, router execution, tool execution path reuse.
- Embedding strategy: optional selector using EmbeddingAdapter / AiSdkEmbeddingAdapter.
- Documentation: recipe + usage examples.

## Checklist

### 1) API + Types

- [x] Add ToolRoutingConfig (global + per-agent) to types.
- [x] Define ToolRouterStrategy interface and ToolRouter types.
- [x] Define execution mode enums and router result types.
- [x] Define embedding strategy config (embedding model/adapter, topK, cache).

### 2) Registry + Defaults

- [x] Add global toolRouting defaults to AgentRegistry.
- [x] Wire VoltAgentOptions.toolRouting to registry defaults.
- [x] Add agent internal setter to apply default tool routing when unset.

### 3) Tool Pool Manager

- [x] Introduce ToolPoolManager (or extend ToolManager) to hold pool tools.
- [x] Add lookup by name (for executing pool tools).
- [x] Ensure pool supports user-defined, provider-defined, and MCP tools.

### 4) Router Tool Runtime

- [x] Implement createToolRouter (router tool factory).
- [x] Agent.prepareTools uses routers + exposed tools; pool tools are not added to LLM tools by default.
- [x] Router execution path:
  - [x] Select tools via strategy.
  - [x] Execute selected tools in parallel.
  - [x] Return structured router output.
- [x] Ensure tool hooks + approvals run (no bypass).

### 5) Agent Mode Execution

- [x] Implement agent-mode arg generation via generateText with structured output.
- [x] Default to agent model; allow executionModel override.
- [x] Provider tool fallback:
  - [x] Force toolChoice to the selected provider tool.
  - [x] Log info for fallback.

### 6) Embedding Strategy (Optional)

- [x] Add embedding-based ToolRouterStrategy.
- [x] Auto-enable when embedding model/adapter is provided.
- [x] Implement tool-to-text serialization and in-memory embedding cache.
- [x] Invalidate cache when tool pool changes.

### 7) Observability + API

- [x] Include pool tools in API responses (getToolsForApi / /agents).
- [x] Add router + selection metadata to spans/logs (safeStringify).
- [x] Ensure pool tools appear in observability with correct tool names.

### 8) Tests

- [ ] Unit tests for strategy selection and router output shape.
- [ ] Agent-mode arg generation tests (schema output).
- [ ] Provider tool fallback tests.
- [ ] Embedding strategy tests (cache + selection order).

### 9) Docs + Recipes

- [x] New recipe: tool routing with router + pool.
- [x] Embedding-based routing example.
- [x] Update sidebars (if needed).

## Open Questions

- None.

## Notes

- Use safeStringify for logs and span attributes.
- Keep output schemas for router results explicit.
- Maintain compatibility with PlanAgent (router tools should work there too).
