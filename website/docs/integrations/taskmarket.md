---
title: Taskmarket
description: Delegate bounded work from a VoltAgent agent through an approval-gated Base USDC requester workflow.
---

# Taskmarket requester integration

`@voltagent/taskmarket` lets a VoltAgent agent create a Taskmarket bounty only after it displays an immutable plan and receives fresh human approval. It then provides read-only tools for live task status and submission review.

## Install

```bash
pnpm add @voltagent/taskmarket @voltagent/core zod
```

Install the separate first-party Taskmarket CLI binary globally, without running package scripts:

```bash
npm install --global --ignore-scripts @lucid-agents/taskmarket@1.11.0
```

Initialize that CLI's wallet and legal configuration interactively:

```bash
taskmarket init
```

`@lucid-agents/taskmarket` supplies the `taskmarket` command used by `taskmarket init` and every runtime preflight; it is distinct from the project dependency `@voltagent/taskmarket`. The first-party CLI owns the wallet and signs the request. The integration does not accept wallet secrets as configuration or tool arguments.
CLI subprocesses are pinned to Taskmarket's production API and receive only a small runtime/filesystem environment allowlist. Host API keys and `TASKMARKET_IDEMPOTENCY_KEY` are not inherited, preventing an approved preview from being redirected, exposing unrelated credentials, or being coupled to an unrelated write attempt.

The bundled runner uses POSIX process groups to terminate the complete descendant tree on timeout or excess output. On Windows it fails closed; inject a `cliRunner` backed by a kill-on-close Windows Job Object before enabling the creation tool.

## Add the toolkit

```ts
import { Agent } from "@voltagent/core";
import { createTaskmarketRequesterToolkit } from "@voltagent/taskmarket";

const taskmarket = createTaskmarketRequesterToolkit({
  requesterAddress: "0xYourTaskmarketCliWallet",
  maximumSpendUsdc: "25",
});

const agent = new Agent({
  name: "delegator",
  instructions: "Preview the exact bounty and ask me to approve it before creation.",
  model: "openai/gpt-4o-mini",
  tools: [taskmarket],
});
```

The host ceiling uses a decimal string so spend checks never depend on floating-point arithmetic. The toolkit also verifies Base chain ID `8453`, canonical Base USDC, the configured requester address, available balance, CLI version, and legal acceptance immediately before creation.

## Approval flow

1. `taskmarket_preview_task` returns the exact description, deliverables, reward, deadline rule, Base network, maximum spend, digest, and authorization statement without making a network request.
2. Show the complete authorization statement to the operator.
3. Pass the exact preview fields to `taskmarket_create_task`. Its `needsApproval: true` policy pauses execution for a fresh VoltAgent approval.
4. The preview is consumed before the CLI write. An ambiguous result is never retried.
5. Continue with `taskmarket_get_task`, `taskmarket_list_submissions`, and `taskmarket_review_submission_artifact`.

The toolkit deliberately exposes no accept or reject tool. Text artifacts are capped, checked against Taskmarket's SHA-256 metadata, and marked as untrusted for human review.

Direct MCP exposure enforces `needsApproval` through the MCP elicitation bridge, shows a bounded exact-argument summary and SHA-256, and requires the operator to check an explicit approval field. If the client has no elicitation bridge, creation fails before the CLI is invoked.

Creation is limited to `public` and `unlisted` tasks. Private-task passwords and viewer policies belong in a dedicated secret-management interface, not in agent-visible tool arguments.

## Reproduce safely

Run the deterministic requester-flow demo without a wallet or payment:

```bash
pnpm --filter @voltagent/taskmarket demo:verify
```

The demo verifies the exact CLI arguments, preflight sequence, single-write rule, created task link, and live-state reconciliation through an injected runner. Run the full package checks with `test`, `typecheck`, and `build`; none of them creates or funds a real task.

See the [package README](https://github.com/VoltAgent/voltagent/tree/main/packages/taskmarket) for the full configuration and recovery contract.
