---
"@voltagent/vercel-ui": patch
---

Added a set of new utility functions for working with data streams in the vercel `ai` package.

## New Functions

### `toDataStream`

You can use this function to convert a VoltAgent `ReadableStream` to a `DataStream`.

```typescript
const result = await agent.streamText("Hello, world!");
const dataStream = toDataStream(result.fullStream);
```

### `mergeIntoDataStream`

You can use this function to merge a VoltAgent `ReadableStream` into a `DataStream` using the vercel `createDataStream` function.

```typescript
const result = await agent.streamText("Hello, world!");

const dataStream = createDataStream({
  execute: async (writer) => {
    const result = await agent.streamText("Hello, world!");
    mergeIntoDataStream(writer, result.fullStream);
  },
});

reply.send(dataStream);
```

### `formatDataStreamPart`

You can use this function to format a data stream part for the vercel `ai` package to be used in the `DataStream` interface, this appends certain metadata for VoltAgent.

```typescript
const result = await agent.streamText("Hello, world!");

const dataStream = toDataStream(result.fullStream);

// This will append subAgentId and subAgentName to the data stream part
```

### `isSubAgentStreamPart`

You can use this function to check if a data stream part is a sub-agent stream part.

```typescript
import { isSubAgentStreamPart } from "@voltagent/vercel-ui";

const messages = useChat(...);

for (const message of messages) {
  if (isSubAgentStreamPart(message)) {
    // This is a sub-agent stream part
    // NOTE: This will ONLY work for Tool calls and results and not other stream parts
    console.log(message.subAgentId, message.subAgentName);
  }
}
```

## New Types

Additional types have been exposed to make it easier to improve types with the vercel `ai` package.

- `UIMessage` - A VoltAgent ready `UIMessage` type, this is a wrapper around the vercel `UIMessage` type.
- `DataStream` - A VoltAgent ready `DataStream` type, this is a wrapper around the vercel `DataStream` type.
