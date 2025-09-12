---
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
---

fix: resolve EADDRINUSE error on server startup by fixing race condition in port availability check - #544

Fixed a critical issue where users would encounter "EADDRINUSE: address already in use" errors when starting VoltAgent servers. The problem was caused by a race condition in the port availability check where the test server wasn't fully closed before the actual server tried to bind to the same port.

## What was happening

When checking if a port was available, the port manager would:

1. Create a test server and bind to the port
2. On successful binding, immediately close the server
3. Return `true` indicating the port was available
4. But the test server wasn't fully closed yet when `serve()` tried to bind to the same port

## The fix

Modified the port availability check in `port-manager.ts` to:

- Wait for the server's close callback before returning
- Add a small delay (50ms) to ensure the OS has fully released the port
- This prevents the race condition between test server closure and actual server startup

## Changes

- **port-manager.ts**: Fixed race condition by properly waiting for test server to close
- **hono-server-provider.ts**: Added proper error handling for server startup failures

This ensures reliable server startup without port conflicts.
