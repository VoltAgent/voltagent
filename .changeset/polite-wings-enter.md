---
"@voltagent/core": patch
---

fix: migrate the provider streams to `AsyncIterableStream`

Example:

```typescript
const stream = createAsyncIterableStream(
  new ReadableStream({
    start(controller) {
      controller.enqueue("Hello");
      controller.enqueue(", ");
      controller.enqueue("world!");
      controller.close();
    },
  })
);

for await (const chunk of stream) {
  console.log(chunk);
}

// in the agent
const result = await agent.streamObject({
  messages,
  model: "test-model",
  schema,
});

for await (const chunk of result.objectStream) {
  console.log(chunk);
}
```

New exports:

- `createAsyncIterableStream`
- `type AsyncIterableStream`
