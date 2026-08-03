---
"@voltagent/core": patch
---

Publish the latest AI SDK v7 tool compatibility updates on the `next` channel.

Raw AI SDK tools remain first-class, including native `contextSchema` and call-level
`toolsContext`. New tools can import AI SDK-compatible `tool()` from
`@voltagent/core` and add VoltAgent metadata under the optional `voltagent`
namespace. Existing AI SDK tools from external packages can be decorated with
`enhanceTool()` without rebuilding the original tool object.

`@voltagent/core` now also re-exports common AI SDK primitives and types, so apps
can keep a single import surface while direct AI SDK functions preserve their
native behavior.

Agent calls now preserve more of the native AI SDK call boundary: `runtimeContext`,
`toolsContext`, `telemetry`, `experimental_telemetry`, and lifecycle callbacks
pass through with AI SDK semantics. VoltAgent hooks remain additive for framework
context, and tool routing now carries `toolsContext`/`runtimeContext` into native
`toolApproval` and routed raw AI SDK tool execution.

Docs now make the compatibility boundary explicit: direct AI SDK function
re-exports keep native behavior, while `agent.generateText()` and
`agent.streamText()` add VoltAgent orchestration and only compose the fields
VoltAgent must own (`model`, prompt/message normalization, tool wiring,
`abortSignal`, and retry/fallback handling).
