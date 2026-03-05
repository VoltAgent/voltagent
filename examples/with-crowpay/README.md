# VoltAgent + CrowPay Example

This example shows how to integrate [CrowPay](https://crowpay.ai) — a payment service for AI agents — with VoltAgent.

## What it does

The agent can:
- **Set up** a managed wallet with spending rules
- **Authorize x402 payments** (USDC on Base) for APIs returning HTTP 402
- **Authorize credit card payments** for merchants and subscriptions
- **Poll approval status** for payments needing human approval

## How CrowPay works

CrowPay provides managed wallets for AI agents with:
- Configurable spending rules (per-transaction limits, daily limits)
- Human approval workflows for amounts above threshold
- Audit trails for all payments
- No private key exposure to the agent

Default rules: auto-approve under $5, human approval above, $50/day limit.

Supports the [x402 payment protocol](https://www.x402.org/) (USDC on Base) and credit card payments via Stripe.

## Running

```bash
pnpm install
pnpm start
```

## Learn more

- [CrowPay](https://crowpay.ai) — Agent payment service
- [Nightmarket](https://nightmarket.ai) — API marketplace (uses CrowPay for payments)
- [x402 protocol](https://www.x402.org/) — HTTP 402 payment standard
