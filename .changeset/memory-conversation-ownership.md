---
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
---

Scope memory conversation access to the authenticated user: when auth middleware is configured, the conversation get / messages / update / delete handlers verify the token's identity against the conversation's stored `userId` and mask other users' conversations as 404, and the conversation list uses the token's identity instead of a client-supplied `userId`. Unauthenticated deployments (no auth configured) keep the historical behavior.
