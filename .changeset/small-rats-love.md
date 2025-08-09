---
"@voltagent/vercel-ui": major
---

feat!: Migrate from AI SDK v4 to v5 with new adapter pattern

## Breaking Changes

- **Removed all v4 exports and utilities**:
  - `convertToUIMessages()` - Message conversion utility
  - `toDataStream()`, `mergeIntoDataStream()`, `formatDataStreamPart()` - Data stream utilities
  - `filterUIMessageParts` (alias: `rejectUIMessageParts`) - Message filtering
  - `isSubAgent` (alias: `isSubAgentStreamPart`) - Guard utilities
  - Type exports: `UIMessage`, `UIMessagePart`, `ToolInvocationUIPart`, `DataStream`, `DataStreamString`, `DataStreamOptions`
- **Upgraded from AI SDK v4 (^4.3.16) to v5 (^5.0.8)**

## New Features

- **New adapter pattern** following LangChain/LlamaIndex conventions:
  - `toUIMessageStream(stream, callbacks?)` - Converts VoltAgent's `StreamPart` to AI SDK v5's `UIMessageChunk`
  - `toDataStreamResponse(stream, options?)` - Creates HTTP Response for Next.js API routes
  - `StreamCallbacks` type for stream event handling
- **Full AI SDK v5 compatibility**:
  - Proper `UIMessageChunk` streaming
  - Support for reasoning-delta chunks (start/delta/end pattern)
  - Tool call and result streaming with dynamic tool names
  - Text streaming with proper start/end events
  - SubAgent metadata via `data-subagent` chunks

## Migration Guide

### Data Stream Usage

Before (v4):

```typescript
import { toDataStream, mergeIntoDataStream } from "@voltagent/vercel-ui";

// Direct stream conversion
const stream = toDataStream(result.fullStream, {
  sendUsage: true,
  sendReasoning: false,
});

// Or merging into existing stream
mergeIntoDataStream(writer, result.fullStream);
```

After (v5):

```typescript
import { toDataStreamResponse } from "@voltagent/vercel-ui";

// Direct HTTP response
return toDataStreamResponse(result.fullStream);

// Or with manual stream handling
import { toUIMessageStream } from "@voltagent/vercel-ui";
const uiStream = toUIMessageStream(result.fullStream);
```

### Message Conversion

Before (v4):

```typescript
import { convertToUIMessages } from "@voltagent/vercel-ui";

const uiMessages = convertToUIMessages(operationContext);
```

After (v5):

```typescript
// Message conversion is now handled by AI SDK v5's built-in utilities
import { convertToModelMessages } from "ai";

const modelMessages = convertToModelMessages(messages);
```

### Type Imports

Before (v4):

```typescript
import type { UIMessage, UIMessagePart } from "@voltagent/vercel-ui";
```

After (v5):

```typescript
import type { UIMessage, UIMessagePart } from "ai";
```
