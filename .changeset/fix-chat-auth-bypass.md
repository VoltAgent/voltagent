---
"@voltagent/server-core": patch
---

fix(server-core): add missing /chat endpoint to protected routes for JWT auth

The /agents/:id/chat endpoint was missing from PROTECTED_ROUTES, causing it to bypass JWT authentication while other execution endpoints (/text, /stream, /object, /stream-object) correctly required authentication.

This fix ensures all agent execution endpoints consistently require JWT authentication when jwtAuth is configured.

Fixes authentication bypass vulnerability on chat endpoint.
