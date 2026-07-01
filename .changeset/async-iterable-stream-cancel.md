---
"@voltagent/internal": patch
---

Cancel the source stream when an `AsyncIterableStream` is iterated and stopped early

`createAsyncIterableStream` returned an async iterator with no `return` method, so breaking out of a `for await...of` loop early left the reader lock held and never cancelled the underlying stream. It now implements `return` to cancel the reader, matching the built-in `ReadableStream` async iterator and tearing down the upstream when iteration stops early.
