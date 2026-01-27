# Tool Routing Implementation Plan

This document captures the implementation plan for VoltAgent tool routing with `searchTools` + `callTool`, a hidden tool pool, and optional embedding-based search.

## Decisions (Locked)

- Tool routing config is supported at both Agent and VoltAgent levels (global default + per-agent override).
- Pool includes user-defined tools, provider-defined tools, and MCP tools.
- `searchTools` returns tool metadata + schemas; `callTool` executes a selected tool by name.
- `callTool` enforces a prior search by default (configurable).
- Embedding search auto-activates when an embedding model or adapter is provided.
- Embedding index uses in-memory cache (extensible later).
- Pool tools are hidden from the model by default; only `searchTools`, `callTool`, and `expose` tools are visible.
- Tool approvals and hooks (tool hooks + agent onToolStart/onToolEnd) still run for pool tools.

## Scope

- Core API: ToolRoutingConfig (embedding/topK/pool/expose/enforceSearchBeforeCall).
- Agent runtime: tool pool, search tool, call tool, validation + approvals.
- Embedding strategy: optional selector using EmbeddingAdapter / AiSdkEmbeddingAdapter.
- Documentation: recipe + usage examples.

## Checklist

### 1) API + Types

- [x] Update ToolRoutingConfig for search + call.
- [x] Define search strategy types and embedding config.
- [x] Remove router-only types from public API.

### 2) Registry + Defaults

- [x] Keep global toolRouting defaults in AgentRegistry.
- [x] Wire VoltAgentOptions.toolRouting to registry defaults.
- [x] Keep agent internal setter to apply default tool routing when unset.

### 3) Tool Pool Manager

- [x] Pool supports user-defined, provider-defined, and MCP tools.
- [x] Lookup by name for callTool execution.

### 4) Search + Call Runtime

- [x] Implement `searchTools` and `callTool` tools.
- [x] Agent.prepareTools exposes only search/call + `expose` tools when routing is enabled.
- [x] Search uses embedding strategy when configured.
- [x] callTool validates args, enforces approvals, and executes tools from pool.

### 5) Observability + API

- [x] Add search selection metadata to spans/logs (safeStringify).
- [x] Ensure pool tools appear in API state without being exposed to the model.

### 6) Tests

- [ ] Search selection tests (embedding + fallback).
- [ ] callTool validation + error path tests.
- [ ] Provider tool fallback tests.
- [ ] Embedding cache tests.

### 7) Docs + Recipes

- [x] Update docs and recipes for search + call.
- [x] Update examples and blog references.

## Notes

- Use safeStringify for logs and span attributes.
- Maintain compatibility with PlanAgent (tool routing config should still work there).
