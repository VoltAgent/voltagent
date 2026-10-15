---
"@voltagent/playground": minor
"@voltagent/core": patch
"@voltagent/server-core": minor
"@voltagent/server-hono": minor
---

Add read-only memory browsing and conversation restoration, API examples/OpenAPI inspection, locally bundled Monaco JSON editors, resizable panels, trace/span links, chat attachment previews and inline subagent streams to the local playground.

Enrich middleware, scorer, workflow and plan nodes and their span details. Add display-only input/output and workflow pause/resume/replay cards without changing trace identities, exports or usage totals. Add workspace event categories, counters, result previews and skill filters.

Expose optional agent voice capability, speaker listing, transcription and speech generation through authenticated Hono agent routes and reusable server-core handlers. The playground supports dictation, reply playback and turn-based STT/TTS conversation for configured voice providers. Validate text, formats and upload sizes, release microphone resources on cancellation and preserve existing agent authentication.

Restore workspace and PlanAgent filesystem metadata on each tool call's own span, retaining the legacy shared-context fallback. Concurrent tool calls no longer lose their workspace attributes, allowing workspace event categories and span details to display recorded operations.
