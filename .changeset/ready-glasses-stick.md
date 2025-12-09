---
"@voltagent/server-core": patch
---

fix: webSocket authentication now uses same logic as HTTP routes

## The Problem

WebSocket endpoints were using a different authentication logic than HTTP endpoints:

- HTTP routes used `requiresAuth()` function which respects `publicRoutes`, `DEFAULT_PUBLIC_ROUTES`, `PROTECTED_ROUTES`, and `defaultPrivate` configuration
- WebSocket routes only checked for console access key or JWT token, ignoring the `publicRoutes` configuration entirely

This meant that setting `publicRoutes: ["/ws/**"]` in your auth configuration had no effect on WebSocket connections.

## The Solution

Updated `setupWebSocketUpgrade` in `packages/server-core/src/websocket/setup.ts` to:

1. Check console access first (console always has access via `VOLTAGENT_CONSOLE_ACCESS_KEY`)
2. Use the same `requiresAuth()` function that HTTP routes use
3. Respect `publicRoutes`, `PROTECTED_ROUTES`, and `defaultPrivate` configuration

## Impact

- **Consistent auth behavior:** WebSocket and HTTP routes now follow the same authentication rules
- **publicRoutes works for WebSocket:** You can now make WebSocket paths public using the `publicRoutes` configuration
- **Console access preserved:** Console with `VOLTAGENT_CONSOLE_ACCESS_KEY` continues to work on all WebSocket paths

## Example

```typescript
const server = new VoltAgent({
  auth: {
    defaultPrivate: true,
    publicRoutes: ["/ws/public/**"], // Now works for WebSocket too!
  },
});
```
