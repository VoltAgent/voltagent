---
"@voltagent/server-core": patch
---

fix: make GET /tools endpoint public when auth is enabled

Previously, `GET /tools` was listed in `PROTECTED_ROUTES`, requiring authentication even though it only returns tool metadata (name, description, parameters). This was inconsistent with `GET /agents` and `GET /workflows` which are publicly accessible for discovery.

## Changes

- Moved `GET /tools` from `PROTECTED_ROUTES` to `DEFAULT_PUBLIC_ROUTES`
- Tool execution (`POST /tools/:name/execute`) remains protected and requires authentication

This allows VoltOps Console and other clients to discover available tools without authentication, while still requiring auth to actually execute them.
