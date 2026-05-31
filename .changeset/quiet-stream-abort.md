---
"@voltagent/core": patch
---

fix: prevent unhandled rejections when aborting `Agent.streamText()` streams

## The Problem

`Agent.streamText()` eagerly read the AI SDK result getters for `text`, `usage`, and `finishReason` while constructing VoltAgent's wrapped result. In AI SDK v6 these fields are lazy promises, so reading them early could materialize promises that the caller never consumes.

When a caller only consumed the UI/full stream and aborted the run, those unconsumed promises could reject globally as `unhandledRejection` events.

## The Solution

VoltAgent now preserves the lazy getter behavior for `text`, `usage`, and `finishReason`. The sanitized text promise is also created only when `result.text` is accessed.

## Impact

- Aborting a consumed `streamText()` stream no longer emits unhandled rejections for unconsumed result fields
- Callers using only `toUIMessageStream()`, `toUIMessageStreamResponse()`, `fullStream`, or `textStream` do not need to attach defensive `.catch()` handlers to `text`, `usage`, or `finishReason`
- Matches AI SDK v6's lazy stream result contract more closely
