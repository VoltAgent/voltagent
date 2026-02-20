---
"@voltagent/core": patch
---

fix: preserve stream output after startup probe on ReadableStream providers

`Agent.streamText()` and `Agent.streamObject()` now probe stream startup using a tee'd branch instead of consuming and cancelling the original `fullStream`.

This prevents early stream interruption where some providers could emit reasoning events and then terminate before forwarding final `text-delta` output to consumers.
