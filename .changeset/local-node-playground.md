---
"@voltagent/core": minor
"@voltagent/playground": minor
---

Add an account-free local playground built with TanStack Start and React Flow. Chat with agents, handle tool approvals, run/suspend/resume/cancel/replay workflows, and inspect local traces, inputs, outputs, and logs.

VoltAgent starts the playground on loopback port 3142 alongside a configured Node server outside production/test. Configure `playground: false` or `{ enabled, port, apiUrl }` in `new VoltAgent()`. Programmatic start/stop methods control the playground independently; API shutdown also stops it. A playground startup failure leaves the API running. Serverless providers do not start a listener.

Synchronize historical traces with conversations and workflow executions, connect resume/replay traces, add detailed node inspectors and a waterfall, stream observability events with HTTP fallback, and provide searchable logs, standalone tool tests, structured run settings, and a workspace file/skill explorer.

Default execution views emphasize model calls and tools with expandable runtime internals, run summaries, input previews in history, and navigation between chat tool calls, graph nodes, and logs. Preserve failures in the overview and distinguish chronological connections from workflow resume/replay links.

Bring Console-style execution cards and SpanDetailsAI to local traces: expandable instructions and I/O, model/retry settings, token and request-context breakdowns, tool parameters, role-based messages, structured JSON, memory/guardrail diffs, prompt/workspace metadata, error stacks, and recorded media previews. The detail panel can expand without unmounting the runner. Hosted analytics and account-dependent screens remain in the Console.

Distinguish pending approvals/client results from completed HTTP requests, explain recovered attempts and skipped/race/bail outcomes, and label loop iterations and foreach items. Add compact cards, collapsible groups with outcome counts, step search/focus, grouped/filterable history, recorded-settings comparisons, and local trace/log exports. Preview resume schemas and replay scope, and notify open clients when a newer UI build is available without interrupting runs.

Simplify the workspace toolbar and default node cards, keep execution statuses separate from code structure, and separate new workflow drafts from recorded results. Keep step search, history filters, timing, comparisons, exports and raw events available on demand.
