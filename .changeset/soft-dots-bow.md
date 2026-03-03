---
"@voltagent/core": patch
---

Avoid reinitializing serverless observability remote exporters when the resolved VoltOps endpoint and headers are unchanged. This prevents unnecessary provider shutdown/recreation cycles that can surface as noisy "Processor shutdown" traces in long-lived serverless instances.

Adds a unit test to ensure repeated environment sync calls do not trigger duplicate `updateServerlessRemote` invocations when config is stable.
