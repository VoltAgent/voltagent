---
"@voltagent/server-hono": patch
---

feat: add hostname configuration support to honoServer - #694

## The Problem

The `honoServer()` function hardcoded `hostname: "0.0.0.0"` which prevented binding to IPv6 addresses. This caused deployment issues on platforms like Railway that require IPv6 or dual-stack binding for private networking.

## The Solution

Added a `hostname` configuration option to `HonoServerConfig` that allows users to specify which network interface to bind to. The default remains `"0.0.0.0"` for backward compatibility.

## Usage Examples

**Default behavior (IPv4 only):**

```typescript
new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    port: 3141,
  }),
});
// Binds to 0.0.0.0 (all IPv4 interfaces)
```

**IPv6 dual-stack (recommended for Railway, Fly.io):**

```typescript
new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    port: 3141,
    hostname: "::", // Binds to both IPv4 and IPv6
  }),
});
```

**Localhost only:**

```typescript
new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    port: 3141,
    hostname: "127.0.0.1", // Local development only
  }),
});
```

**Environment-based configuration:**

```typescript
new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    port: parseInt(process.env.PORT || "3141"),
    hostname: process.env.HOSTNAME || "::", // Default to dual-stack
  }),
});
```

This change is fully backward compatible and enables VoltAgent to work seamlessly on modern cloud platforms with IPv6 networking.
