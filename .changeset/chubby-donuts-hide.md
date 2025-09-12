---
"@voltagent/core": patch
---

fix: improve shutdown handlers to properly stop server and clean up resources - #528

## What Changed

Fixed the shutdown handler to properly stop the VoltAgent server and clean up all resources when receiving SIGINT/SIGTERM signals. This ensures the process can exit cleanly when multiple signal handlers exist from other frameworks.

## The Problem (Before)

When multiple SIGINT/SIGTERM handlers existed (from frameworks like Adonis, NestJS, etc.), the VoltAgent server would remain open after shutdown, preventing the process from exiting cleanly. The previous fix only addressed the `process.exit()` issue but didn't actually stop the server.

## The Solution (After)

- **Server Cleanup**: The shutdown handler now properly stops the server using `stopServer()`
- **Telemetry Shutdown**: Added telemetry/observability shutdown for complete cleanup
- **Public API**: Added a new `shutdown()` method for programmatic cleanup
- **Resource Order**: Resources are cleaned up in the correct order: server → workflows → telemetry
- **Framework Compatibility**: Still respects other frameworks' handlers using `isSoleSignalHandler` check

## Usage

```typescript
// Programmatic shutdown (new)
const voltAgent = new VoltAgent({ agents, server });
await voltAgent.shutdown(); // Cleanly stops server, workflows, and telemetry

// Automatic cleanup on SIGINT/SIGTERM still works
// Server is now properly stopped, allowing the process to exit
```

This ensures VoltAgent plays nicely with other frameworks while properly cleaning up all resources during shutdown.
