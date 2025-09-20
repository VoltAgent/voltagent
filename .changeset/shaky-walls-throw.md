---
"@voltagent/core": patch
---

fix: resolve workflow stream text-delta empty output and improve type safety

## The Problem

When forwarding agent.streamText() results to workflow streams via writer.pipeFrom(), text-delta events had empty output fields. This was caused by incorrect field mapping - the code was accessing `part.textDelta` but AI SDK v5 uses `part.text` for text-delta events.

## The Solution

Fixed field mappings to match AI SDK v5 conventions:

- text-delta: `textDelta` → `text`
- tool-call: `args` → `input`
- tool-result: `result` → `output`
- finish: `usage` → `totalUsage`

Also improved type safety by:

- Using `VoltAgentTextStreamPart` type instead of `any` for fullStream parameter
- Proper type guards with `in` operator to check field existence
- Eliminated need for `as any` casts

## Impact

- Fixes "output field is undefined" for text-delta events in workflow streams
- Provides proper TypeScript type checking for stream parts
- Ensures compatibility with AI SDK v5 field conventions
- Better IDE support and compile-time error detection
