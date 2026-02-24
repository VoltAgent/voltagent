# VoltAgent Human-in-the-Loop (HITL) Example

This example shows how to use tool-level approvals with `needsApproval` while keeping agent DX unchanged.

## What It Demonstrates

- `crmHitlAgent`: direct CRM delete flow with `needsApproval`.
- `triageAgent` + `crmAgent`: subagent delegation flow where CRM delete uses `needsApproval`.
- Approval pause/resume semantics for both direct and delegated execution.

## Setup

```bash
pnpm install
```

Copy environment file:

```bash
cp .env.example .env
```

Set:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

## Run the Server

```bash
pnpm dev
```

Registered agents:

- `crmHitlAgent`
- `triageAgent`
- `crmAgent`

## Manual Testing

### 1) Direct agent (`crmHitlAgent`)

Trigger approval:

```bash
curl -X POST http://localhost:3141/agents/crmHitlAgent/chat \
  -H "Content-Type: application/json" \
  -d '{"input":"CRMdeki user_123 kullanıcısını kalıcı olarak sil."}'
```

You should see a pending `deleteCrmUser` approval state (`approval-requested`) and approve/deny actions in compatible UIs.

### 2) Subagent path (`triageAgent`)

Trigger delegation + CRM approval:

```bash
curl -X POST http://localhost:3141/agents/triageAgent/chat \
  -H "Content-Type: application/json" \
  -d '{"input":"CRM tarafında user_123 hesabını tamamen kaldır."}'
```

Triage should delegate to `CRM Agent`, and approval should be required on CRM-side delete execution.
In this delegated path, approval UI can surface on the `delegate_task` tool part. This is expected; it still controls the underlying CRM delete approval.

## Run Smoke Test

From this directory:

```bash
pnpm test:smoke
```

Or from repo root:

```bash
pnpm --filter voltagent-example-with-hitl test:smoke
```

Smoke test validates both flows:

- direct HITL (`crmHitlAgent`)
- subagent HITL (`triageAgent -> crmAgent`)

It tries `examples/with-hitl/.env` first and falls back to `examples/base/.env` for `OPENAI_API_KEY`.
