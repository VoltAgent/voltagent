---
"@voltagent/core": patch
---

feat: Enhanced Operation Context (`userContext`) with Initialization and Propagation

We've significantly improved how you can manage and pass custom data through agent operations using `userContext`.

**Key Enhancements:**

1.  **Direct Object & Typed Context:** `userContext` is no longer a `Map`. It's now a direct generic object (`TContext`), defaulting to `Record<string, any>`. This allows for better type safety and a more natural way to work with your context data.

    ```typescript
    // Old way (Map-based, less type-safe for structure)
    // context.userContext.set("userId", "user-123");
    // const userId = context.userContext.get("userId");

    // New way (Direct object, typed)
    type MyOperationContext = { userId?: string; traceId?: string };
    // context: OperationContext<MyOperationContext>
    // context.userContext.userId = "user-123";
    // const userId = context.userContext.userId;
    ```

2.  **Initialization with `initialUserContext`:** You can now provide an initial state for an operation's `userContext` directly when calling agent generation methods (e.g., `generateText`, `streamObject`).

    ```typescript
    type CallSpecificContext = {
      correlationId: string;
      userId: string;
      featureFlags?: Record<string, boolean>;
    };

    const agent = new Agent({
      /* ... */
    });

    const initialDataForOperation: CallSpecificContext = {
      correlationId: `cid-${Date.now()}`,
      userId: "user-456",
      featureFlags: { newUIAvailable: true },
    };

    // Pass initial context when starting an operation
    await agent.generateText<CallSpecificContext>("Process this request.", {
      initialUserContext: initialDataForOperation,
    });
    // Inside hooks or tools, operationContext.userContext will be pre-populated
    // with initialDataForOperation and will be of type CallSpecificContext.
    ```

3.  **Automatic Propagation to Sub-Agents:** When using a supervisor-subagent hierarchy, the `initialUserContext` provided to the supervisor (or its current `userContext`) is now automatically propagated to sub-agents when tasks are delegated via the `delegate_task` tool.

    - The supervisor's `userContext` is passed as `supervisorUserContext` during handoff.
    - This becomes the `initialUserContext` for the sub-agent's operation.
    - This is great for passing down global IDs like `correlationId` or `sessionId` through the entire agent chain.

    ```typescript
    // Supervisor starts with a correlationId
    // await supervisor.generateText<MyTraceContext>(
    //   "Delegate analysis for project X.",
    //   { initialUserContext: { correlationId: "global-trace-id-123" } }
    // );

    // SubAgent's onStart hook can access this:
    // onStart: ({ context }: OnStartHookArgs<MyTraceContext>) => {
    //   console.log(context.userContext.correlationId); // "global-trace-id-123"
    // }
    ```

These changes offer a more robust, type-safe, and developer-friendly way to manage and utilize operation-specific context data across your agent's lifecycle and hierarchies. Check out the updated [`Operation Context`](http://localhost:3000/docs/agents/context/) documentation for detailed examples!
