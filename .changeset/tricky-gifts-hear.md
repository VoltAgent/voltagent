---
"@voltagent/core": patch
---

feat: add OperationContext support to Memory adapters for dynamic runtime behavior

## The Problem

Memory adapters (InMemory, PostgreSQL, custom) had fixed configuration at instantiation time. Users couldn't:

1. Pass different memory limits per `generateText()` call (e.g., 10 messages for quick responses, 100 for summaries)
2. Access agent execution context (logger, tracing, abort signals) within memory operations
3. Implement context-aware memory behavior without modifying adapter configuration

## The Solution

**Framework (VoltAgent Core):**

- Added optional `context?: OperationContext` parameter to all `StorageAdapter` methods
- Memory adapters now receive full agent execution context including:
  - `context.context` - User-provided key-value map for dynamic parameters
  - `context.logger` - Contextual logger for debugging
  - `context.traceContext` - OpenTelemetry tracing integration
  - `context.abortController` - Cancellation support
  - `userId`, `conversationId`, and other operation metadata

**Type Safety:**

- Replaced `any` types with proper `OperationContext` type
- No circular dependencies (type-only imports)
- Full IDE autocomplete support

## Usage Example

### Dynamic Memory Limits

```typescript
import { Agent, Memory, InMemoryStorageAdapter } from "@voltagent/core";
import type { OperationContext } from "@voltagent/core/agent";

class DynamicMemoryAdapter extends InMemoryStorageAdapter {
  async getMessages(
    userId: string,
    conversationId: string,
    options?: GetMessagesOptions,
    context?: OperationContext
  ): Promise<UIMessage[]> {
    // Extract dynamic limit from context
    const dynamicLimit = context?.context.get("memoryLimit") as number;
    return super.getMessages(
      userId,
      conversationId,
      {
        ...options,
        limit: dynamicLimit || options?.limit || 10,
      },
      context
    );
  }
}

const agent = new Agent({
  memory: new Memory({ storage: new DynamicMemoryAdapter() }),
});

// Short context for quick queries
await agent.generateText("Quick question", {
  context: new Map([["memoryLimit", 5]]),
});

// Long context for detailed analysis
await agent.generateText("Summarize everything", {
  context: new Map([["memoryLimit", 100]]),
});
```

### Access Logger and Tracing

```typescript
class ObservableMemoryAdapter extends InMemoryStorageAdapter {
  async getMessages(...args, context?: OperationContext) {
    context?.logger.debug("Fetching messages", {
      traceId: context.traceContext.getTraceId(),
      userId: args[0],
    });
    return super.getMessages(...args, context);
  }
}
```

## Impact

- ✅ **Dynamic behavior per request** without changing adapter configuration
- ✅ **Full observability** - Access to logger, tracing, and operation metadata
- ✅ **Type-safe** - Proper TypeScript types with IDE autocomplete
- ✅ **Backward compatible** - Context parameter is optional
- ✅ **Extensible** - Custom adapters can implement context-aware logic

## Breaking Changes

None - the `context` parameter is optional on all methods.
