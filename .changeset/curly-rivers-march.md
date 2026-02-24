---
"@voltagent/core": patch
---

fix: make delegated `needsApproval` resume correctly in sub-agent flows

This patch improves Human-in-the-Loop behavior when a supervisor delegates work via `delegate_task`.

### What changed

- Approval responses attached to `tool-delegate_task` UI parts are now matched to the guarded sub-agent tool call and correctly resume execution.
- Parent tool-context messages are forwarded to delegated sub-agents as shared context, so required arguments (for example `userId`) are not lost during handoff.
- Sub-agent forwarding defaults now include approval events (`tool-approval-request`, `tool-approval-response`) in addition to tool call/result events.

### No DX change for tool authors

You still define approvals the same way:

```ts
const deleteCrmUser = createTool({
  name: "deleteCrmUser",
  parameters: z.object({
    userId: z.string(),
    reason: z.string().optional(),
  }),
  needsApproval: true,
  execute: async ({ userId }) => ({ ok: true, userId }),
});
```

### Delegated flow example

```ts
const crmAgent = new Agent({
  name: "CRM Agent",
  model: "openai/gpt-4o-mini",
  instructions: "Handle CRM mutations.",
  tools: [deleteCrmUser],
});

const triageAgent = new Agent({
  name: "Triage Agent",
  model: "openai/gpt-4o-mini",
  instructions: "Route CRM delete requests to CRM Agent.",
  subAgents: [crmAgent],
});
```

When the UI sends approval on a delegated part:

```ts
{
  role: "assistant",
  parts: [
    {
      type: "tool-delegate_task",
      state: "approval-responded",
      approval: { id: "approval-call_123", approved: true }
    }
  ]
}
```

VoltAgent now resumes the pending guarded tool call in the sub-agent instead of re-requesting approval.
