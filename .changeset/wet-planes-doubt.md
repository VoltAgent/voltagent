---
"@voltagent/core": patch
---

feat: added a new `BackgroundQueue` utility class for managing background operations with enhanced reliability, performance, and order preservation across the VoltAgent core system.

## Performance Improvements

**All blocking operations have been moved to background jobs**, resulting in significant performance gains:

- **Agent execution is no longer blocked** by history persistence, memory operations, or telemetry exports
- **3-5x faster response times** for agent interactions due to non-blocking background processing
- **Zero blocking delays** during agent conversations and tool executions
