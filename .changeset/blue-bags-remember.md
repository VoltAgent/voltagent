---
"@voltagent/core": minor
---

feat: add workflow observer/watch APIs for stream results

### What's New

- Added run-level observer APIs on `WorkflowStreamResult`:
  - `watch(cb)`
  - `watchAsync(cb)`
  - `observeStream()`
  - `streamLegacy()`
- These APIs are now available on:
  - `workflow.stream(...)`
  - `workflow.timeTravelStream(...)`
  - resumed stream results returned from `.resume(...)`
- Added test coverage for event ordering, unsubscribe behavior, multiple watchers, callback isolation, and `observeStream()` close semantics.

### SDK Example

```ts
const stream = workflow.stream({ value: 3 });

const unwatch = stream.watch((event) => {
  console.log("[watch]", event.type, event.from);
});

const unwatchAsync = await stream.watchAsync(async (event) => {
  if (event.type === "workflow-error") {
    await notifyOps(event);
  }
});

const reader = stream.observeStream().getReader();
const observerTask = (async () => {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log("[observeStream]", value.type);
  }
})();

for await (const event of stream) {
  console.log("[main iterator]", event.type);
}

unwatch();
unwatchAsync();
await observerTask;

const state = await stream.streamLegacy().getWorkflowState();
console.log("final status:", state?.status);
```

### Time Travel Stream Example

```ts
const replayStream = workflow.timeTravelStream({
  executionId: sourceExecutionId,
  stepId: "step-approval",
});

const stopReplayWatch = replayStream.watch((event) => {
  console.log("[replay]", event.type, event.from);
});

for await (const event of replayStream) {
  console.log("[replay iterator]", event.type);
}

stopReplayWatch();
```
