---
title: VoltOps LLM Observability Platform
slug: /
---

# VoltOps LLM Observability Platform

VoltOps helps you monitor and debug VoltAgent applications by turning executions into visual traces. You can inspect model calls, tool usage, multi-agent hops, logs, and latency from one place.

This Getting Started section is for developers who want to go from setup to the first debuggable trace quickly.

Experience VoltOps in action with [**Live Demo**](https://console.voltagent.dev/demo).

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/docs/voltop-docs/voltops-observability.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

## Why It Matters for AI Agent Builders

- AI agents are non-deterministic; the same prompt can produce different paths. VoltOps helps you see what actually happened in each run.
- Multi-step flows break in subtle places (model choice, tool inputs, retries, sub-agent delegation). VoltOps shows the exact failing step instead of forcing guesswork.
- As agent complexity grows, debugging with plain logs becomes slow. Visual traces make root-cause analysis faster and safer in production.
- Observability also improves iteration speed: you can compare runs, track behavior changes, and validate improvements before broad rollout.

## Start Here

1. [**Setup**](setup) - Connect your VoltAgent app to VoltOps in a few minutes.
2. [**Mental Model**](mental-model) - Learn how traces, spans, and context map to the UI.
3. [**Tracing Overview**](tracing/overview) - Continue with full tracing features.
