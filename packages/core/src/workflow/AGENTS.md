# Core Workflow Runtime

Owns workflow creation, chaining, execution, streaming, suspension, time travel, and step helpers. Type inference, suspend/resume state, step IDs, hooks, and usage tracking all need to stay consistent.

## Critical Rules

- **Step IDs are checkpoint anchors.** Renaming or reassigning step IDs breaks resume of in-flight workflows and time-travel replay. Treat IDs like database primary keys.
- **Checkpoint format is persisted.** Workflow state is serialized via `safeStringify`. Schema changes to `WorkflowSuspensionMetadata` / `WorkflowStateStore` / `WorkflowCheckpointStepData` break deserialization of stored executions.
- **Type inference is API.** `WorkflowChain` generics propagate output types through `.andThen` → `.andAll` → `.andRace`, etc. Add `*.spec-d.ts` coverage for any chain or step typing change.
- **New / changed steps must be exported** from `steps/index.ts` and, when public, from `src/index.ts` plus `packages/core/src/index.ts`.
- **Step-specific behavior belongs in a step helper**, not in `core.ts` executor logic. Resist special-casing in the executor.
- **Thread `AbortSignal` and `suspendController.signal` through chains.** Breaking the signal chain breaks graceful cancellation and suspension.

## Authoring Workflows

```ts
const workflow = createWorkflow(
  {
    id: "user-onboarding",
    input: z.object({ userId: z.string() }),
    result: z.object({ message: z.string() }),
  },
  andThen({
    id: "fetch-user",
    execute: async ({ data }) => ({ ...data, user: await db.getUser(data.userId) }),
  }),
  andAgent(({ data }) => `Welcome message for ${data.user.name}`, agent, {
    schema: z.object({ message: z.string() }),
  })
);

const result = await workflow.run({ userId: "123" });
```

## Steps

To add a new step type:

1. Create `steps/and-my-step.ts` exporting a factory function with a stable `id`.
2. Export from `steps/index.ts` and add types to `steps/types.ts`.
3. Re-export from `packages/core/src/index.ts` if public.
4. Add tests: `steps/and-my-step.spec.ts` (runtime) and add inference assertions in `chain.spec-d.ts` if generics change.

Each step receives a `WorkflowExecuteContext` with `{ data, state, workflowState, setWorkflowState, getStepData, getStepResult, getInitData, suspend, bail, abort, resumeData?, retryCount, logger, writer }` (see `internal/types.ts` for canonical shape). Returns the next data value or throws.

## Suspend / Resume

```ts
// Inside a step
suspend("waiting-for-approval", { approvalId: "a-123" });

// Resume — two equivalent shapes:
// 1. From the result object returned by the original run
const result = await workflow.run(input);
if (result.status === "suspended") {
  await result.resume({ approved: true });
}

// 2. By executionId (if you only have the ID + an external checkpoint store)
await workflow.run(input, {
  resumeFrom: { executionId, resumeStepIndex, resumeData: { approved: true } },
});
```

`WorkflowSuspensionMetadata.checkpoint` captures `{ stepExecutionState, completedStepsData, workflowState, stepData, usage }`. Always serialize with `safeStringify` for telemetry/persistence:

```ts
import { safeStringify } from "@voltagent/internal";
span.setAttribute("workflow.checkpoint", safeStringify(checkpoint));
```

## Time Travel

`workflow.timeTravel({ executionId, stepId, inputData?, resumeData?, workflowStateOverride?, memory? })` replays from a prior step in a previous execution with a new execution ID. Original state is loaded, prior step outputs restored up to `stepId`, then execution continues normally.

## Hooks & Usage

Hooks: `onStart`, `onStepStart`, `onStepEnd`, `onSuspend`, `onError`, `onFinish`, `onEnd`. Terminal hooks receive `WorkflowHookContext` (status, result, error, suspension/cancellation metadata, per-step snapshots).

Usage (tokens, cost) is accumulated across `andAgent` steps and surfaces in `result.usage` and `WorkflowSuspensionMetadata.checkpoint.usage`.

## Type Inference Pattern

```ts
// chain.spec-d.ts
const workflow = createWorkflowChain({
  id: "test",
  input: z.object({ userId: z.string() }),
  result: z.object({ name: z.string() }),
})
  .andThen({
    id: "load",
    execute: async ({ data }) => {
      expectTypeOf(data).toEqualTypeOf<{ userId: string }>();
      return { ...data, name: "Alice" };
    },
  })
  .andThen({
    id: "use",
    execute: async ({ data }) => {
      expectTypeOf(data).toEqualTypeOf<{ userId: string; name: string }>();
      return { name: data.name };
    },
  });
```

Add `*.spec-d.ts` cases when changing chain generics, schema-narrowed outputs, or `andAll` / `andRace` array typing.

## Boundaries

**Allowed without asking**

- Adding new step types.
- New hook handlers.
- New utility helpers in `internal/`.
- New tests.
- Telemetry attributes (using `safeStringify`).

**Ask first**

- Chain generic changes (`WorkflowChain<INPUT, RESULT, CURRENT_DATA, …>`).
- New schema fields on `WorkflowStepData`.
- Hook signature changes.
- Modifying suspend/resume protocol.

**Never without explicit ask**

- Renaming or removing chain methods.
- Changing checkpoint shape in a non-backwards-compatible way.
- Removing step ID stability guarantees.
- Special-casing a step in `core.ts` instead of a step helper.

## Tests

```bash
pnpm --dir packages/core test:single -- src/workflow/core.spec.ts
pnpm --dir packages/core test:single -- src/workflow/suspend-resume.spec.ts
pnpm --dir packages/core test:single -- src/workflow/time-travel.spec.ts
pnpm --dir packages/core typecheck   # validates *.spec-d.ts
```

When changing suspend/resume or checkpoint format, add round-trip tests to `suspend-resume.spec.ts`. For type changes, add `expectTypeOf` cases to `chain.spec-d.ts`.

## Related

- Parents: [`../../AGENTS.md`](../../AGENTS.md) (package), [`../../../../AGENTS.md`](../../../../AGENTS.md) (repo)
- Siblings: [`../agent/AGENTS.md`](../agent/AGENTS.md), [`../memory/AGENTS.md`](../memory/AGENTS.md), [`../workspace/AGENTS.md`](../workspace/AGENTS.md), [`../voltops/AGENTS.md`](../voltops/AGENTS.md), [`../tool/AGENTS.md`](../tool/AGENTS.md), [`../observability/AGENTS.md`](../observability/AGENTS.md), [`../mcp/AGENTS.md`](../mcp/AGENTS.md), [`../a2a/AGENTS.md`](../a2a/AGENTS.md)
- External: `../triggers/` (event-driven workflow starts)
