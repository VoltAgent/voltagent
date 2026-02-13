---
"@voltagent/core": patch
"@voltagent/server-core": patch
---

feat: add persisted feedback-provided markers for message feedback metadata

- `AgentFeedbackMetadata` now supports `provided`, `providedAt`, and `feedbackId`.
- Added `Agent.isFeedbackProvided(...)` and `Agent.isMessageFeedbackProvided(...)` helpers.
- Added `agent.markFeedbackProvided(...)` to persist a feedback-submitted marker on a stored message so feedback UI can stay hidden after memory reloads.
- Added `result.feedback.markFeedbackProvided(...)` and `result.feedback.isProvided()` helper methods for SDK usage.
- Updated server response schema to include the new feedback metadata fields.

```ts
const result = await agent.generateText("How was this answer?", {
  userId: "user-1",
  conversationId: "conv-1",
  feedback: true,
});

if (result.feedback && !result.feedback.isProvided()) {
  // call after your feedback ingestion succeeds
  await result.feedback.markFeedbackProvided({
    feedbackId: "fb_123", // optional
  });
}
```
