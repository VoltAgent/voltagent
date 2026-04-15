---
"@voltagent/core": patch
---

fix(core): forward providerMetadata on tool-result and tool-error stream chunks

Google Vertex thinking models attach `providerMetadata` (containing `thoughtSignature`) to
tool-output stream events. The `tool-result` → `tool-output-available` and `tool-error` →
`tool-output-error` conversions in `convertFullStreamChunkToUIMessageStream` were not forwarding
this field, causing the AI SDK's UI message stream schema validation to reject the chunk as
having unrecognized keys. This broke all tool calls when using `@ai-sdk/google-vertex` with
thinking models (e.g. `gemini-3-flash-preview`).

Fixes #1195
