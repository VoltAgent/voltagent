---
id: hitl
title: Human-in-the-Loop (HITL)
slug: hitl
description: Tool approval flows with needsApproval for both direct agent and subagent delegation.
---

# Human-in-the-Loop (HITL)

This recipe shows tool-level approval with `needsApproval` in two paths:

- direct agent execution
- supervisor -> subagent delegation

## Quick Setup

```typescript
import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

const deleteCrmUser = createTool({
  name: "deleteCrmUser",
  description: "Permanently delete a CRM user.",
  parameters: z.object({
    userId: z.string().min(1),
    reason: z.string().optional(),
  }),
  needsApproval: true,
  execute: async ({ userId, reason }) => ({
    ok: true,
    action: "user-deleted",
    userId,
    reason: reason || "user-requested deletion",
  }),
});

// 1) Direct HITL agent
const crmHitlAgent = new Agent({
  name: "CRM HITL Agent",
  instructions: "Handle CRM operations and use tools for destructive actions.",
  model: "openai/gpt-4o-mini",
  tools: [deleteCrmUser],
});

// 2) Subagent HITL path
const crmAgent = new Agent({
  name: "CRM Agent",
  instructions: "Handle CRM account operations.",
  model: "openai/gpt-4o-mini",
  tools: [deleteCrmUser],
});

const triageAgent = new Agent({
  name: "Triage Agent",
  instructions: "Route CRM account mutations to CRM Agent.",
  model: "openai/gpt-4o-mini",
  subAgents: [crmAgent],
});

new VoltAgent({
  agents: {
    crmHitlAgent,
    crmAgent,
    triageAgent,
  },
  server: honoServer({ port: 3141 }),
});
```

## Test Direct Agent

```bash
curl -N -X POST http://localhost:3141/agents/crmHitlAgent/chat \
  -H "Content-Type: application/json" \
  -d '{"input":"Delete CRM user user_123."}'
```

Expected behavior:

1. Tool call is paused with `approval-requested`.
2. UI/API sends approval response.
3. Tool executes and agent continues.

## Resume with Raw API (`tool-approval-response`)

After you receive `approval.id` from the first response, resume like this:

```bash
curl -N -X POST http://localhost:3141/agents/crmHitlAgent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "input": [
      {
        "id": "asst-approval-1",
        "role": "assistant",
        "parts": [
          {
            "type": "tool-deleteCrmUser",
            "toolCallId": "call_123",
            "state": "approval-requested",
            "input": { "userId": "user_123" },
            "approval": { "id": "approval-call_123" }
          }
        ]
      },
      {
        "id": "tool-approval-1",
        "role": "tool",
        "parts": [
          {
            "type": "tool-approval-response",
            "approvalId": "approval-call_123",
            "approved": true,
            "reason": "approved by operator"
          }
        ]
      },
      {
        "id": "user-continue-1",
        "role": "user",
        "parts": [{ "type": "text", "text": "Continue." }]
      }
    ],
    "options": { "conversationId": "conv-hitl-1", "userId": "user-1" }
  }'
```

## Test Subagent Flow

```bash
curl -N -X POST http://localhost:3141/agents/triageAgent/chat \
  -H "Content-Type: application/json" \
  -d '{"input":"Delete CRM user user_123 permanently."}'
```

In delegated runs, approval UI may appear on `tool-delegate_task`. This is expected and still controls the guarded subagent tool call.

## Full Example

- [with-hitl example on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-hitl)
- [Tools docs: needsApproval](https://voltagent.dev/docs/agents/tools/#tool-execution-approval-needsapproval)
