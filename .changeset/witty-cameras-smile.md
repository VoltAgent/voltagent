---
"@voltagent/core": patch
---

fix: preserve getter-based `fullStream` tee behavior after startup probing in `streamText`/`streamObject`

This prevents `TypeError [ERR_INVALID_STATE]: Invalid state: ReadableStream is locked` when SDK consumers iterate `result.fullStream` while other result accessors (such as `result.text` or UI stream helpers) are also consuming the stream.
