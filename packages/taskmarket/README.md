# @voltagent/taskmarket

Approval-gated Taskmarket requester tools for VoltAgent. The toolkit lets an agent preview and create one Base USDC bounty, retrieve its live status, and present bounded submissions for human review.

The package delegates signing and payment to Taskmarket's first-party CLI. It never accepts a private key, seed phrase, token, cookie, or keystore password.
The runner pins `https://api.taskmarket.dev` and passes only a small runtime/filesystem environment allowlist. It never inherits host API keys or an idempotency key, so an approved preview cannot be redirected to another backend, expose unrelated credentials, or accidentally reuse an unrelated write attempt.

The bundled runner uses POSIX process groups so a timeout or output limit terminates the complete CLI descendant tree. It fails closed on Windows; a Windows host must inject a `cliRunner` that assigns the CLI to a kill-on-close Job Object.

## Install

```bash
pnpm add @voltagent/taskmarket @voltagent/core zod
```

Install Taskmarket's separate first-party CLI binary globally, without running package scripts:

```bash
npm install --global --ignore-scripts @lucid-agents/taskmarket@1.11.0
```

Then initialize its wallet and legal configuration interactively:

```bash
taskmarket init
```

Review and accept the current Taskmarket legal bundle through the CLI before enabling creation. Keep the CLI wallet low-value and set a separate withdrawal address.

## Configure

```ts
import { Agent, VoltAgent } from "@voltagent/core";
import { createTaskmarketRequesterToolkit } from "@voltagent/taskmarket";

const taskmarket = createTaskmarketRequesterToolkit({
  requesterAddress: "0xYourTaskmarketCliWallet",
  maximumSpendUsdc: "25",
});

const agent = new Agent({
  name: "requester",
  instructions: "Delegate bounded work only after the operator approves the exact preview.",
  model: "openai/gpt-4o-mini",
  tools: [taskmarket],
});

new VoltAgent({ agents: { agent } });
```

If `taskmarket legal status` reports a draft bundle that the operator accepted outside the CLI, pass its exact reviewed `sha256:...` value as `acceptedLegalBundleDigest`. A changed digest fails closed.

## Requester flow

1. Call `taskmarket_preview_task` with the exact description, reward, duration, deliverables, and maximum spend. It performs no network request and returns an immutable five-minute preview.
2. Show the complete `authorizationStatement` to the operator.
3. Call `taskmarket_create_task` with the returned `previewId`, `planDigest`, and unchanged `authorizationStatement`. VoltAgent always pauses this tool call for fresh human approval.
4. The toolkit rechecks the CLI version, Base chain ID, canonical USDC contract, requester wallet, balance, legal receipt, and host spend ceiling before invoking `taskmarket task create` once.
5. Use `taskmarket_get_task`, `taskmarket_list_submissions`, and `taskmarket_review_submission_artifact` for read-only follow-up.

No accept or reject tool is exposed. Submission artifacts are size-bounded, hash-verified, and explicitly marked as untrusted content.

When tools are exposed directly through `@voltagent/mcp-server`, the same creation policy shows a bounded exact-argument summary and SHA-256 in MCP elicitation, then requires an explicitly checked approval field. Clients without an elicitation bridge fail closed before the CLI is called.

The creation tool supports `public` and `unlisted` tasks. Private tasks are intentionally excluded because their access password or viewer policy needs a dedicated secret-management UI rather than an LLM tool argument.

### Example preview

```text
Authorize exactly one Taskmarket bounty creation with these immutable terms:
Network: Base (chain ID 8453)
Asset: USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
Requester: 0xYourTaskmarketCliWallet
Reward/funding amount: 5 USDC
Maximum spend: 5 USDC
Deadline: 24 hours after Taskmarket accepts creation
Visibility: public; submissions: winner_only
Exact description size: <N> UTF-8 bytes
Exact description SHA-256: <64 lowercase hexadecimal characters>
Exact description:
Summarize the supplied dataset.

## Deliverables
1. report.md with citations
Plan digest: sha256:...
```

If task creation times out, returns malformed output, or cannot be verified, the result is `status: "unknown"` and `retryAllowed: false`. Inspect `taskmarket inbox` and the requester wallet history; never replay the consumed preview.

## Development

```bash
pnpm --filter @voltagent/taskmarket demo:verify
pnpm --filter @voltagent/taskmarket test
pnpm --filter @voltagent/taskmarket typecheck
pnpm --filter @voltagent/taskmarket build
```

All tests use an injected fake CLI runner. They do not create tasks, sign messages, or spend USDC.

### Reproducible demo log

`demo:verify` exercises the complete safe creation path: local preview, exact authorization fields, CLI/network/wallet/balance/legal preflight, one simulated creation, and live-state verification. It uses the same injected runner as the test suite, so it is safe to run without a wallet:

```text
RUN  v3.2.4 packages/taskmarket
✓ TaskmarketRequester creation > runs exact preflight checks, creates once, and verifies live state
Test Files  1 passed (1)
Tests       1 passed | 22 skipped (23)
```

The verified result includes the created task ID and canonical Taskmarket link, live `open` status, expiry, escrow transaction hash, idempotency key, and the authorized plan digest. Real creation remains intentionally untested because it would fund an onchain bounty; the fake runner asserts the exact first-party CLI arguments and that only one write is attempted.

## License

MIT
