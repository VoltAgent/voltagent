---
"@voltagent/serverless-hono": patch
---

fix(serverless-hono): defer waitUntil cleanup to prevent tool crashes in Cloudflare Workers

The `finally` block in `toCloudflareWorker()`, `toVercelEdge()`, and `toDeno()` was calling `cleanup()` immediately when the Response was returned, before streaming and tool execution completed. This cleared the global `___voltagent_wait_until` while tools were still using it, causing crashes with time-consuming tools.

Cleanup is now deferred through the platform's own `waitUntil()` so it runs only after all pending background work has settled.
