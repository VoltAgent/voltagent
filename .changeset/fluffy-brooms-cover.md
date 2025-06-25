---
"@voltagent/vercel-ui": patch
---

Fix to match the output of `mergeIntoDataStream` and `convertToUIMessages` as the `mergeIntoDataStream` filters out the `SubAgent` prefix of a `toolName` (i.e. `BlogReader: read-blog-post`). `convertToUIMessages` was not filtering out the `SubAgent` prefix by default and it was causing the `toolName` to be different on the server in the `onEnd` hook from whats being sent to the client (and expected by the developer).
