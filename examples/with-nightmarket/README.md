# VoltAgent + Nightmarket Example

This example shows how to integrate [Nightmarket](https://nightmarket.ai) — an API marketplace for AI agents — with VoltAgent.

## What it does

The agent can:
- **Search** the Nightmarket marketplace for paid third-party APIs
- **Get details** for any service including request/response examples and pricing
- **Call services** with automatic x402 payment flow handling

## How Nightmarket works

Nightmarket is a marketplace where AI agents discover and pay for API services. Every call settles on-chain in USDC on Base using the [x402 payment protocol](https://www.x402.org/) — no API keys or subscriptions needed.

1. Agent searches marketplace → finds relevant APIs
2. Agent calls the service → gets 402 Payment Required (normal x402 behavior)
3. Agent forwards 402 to [CrowPay](https://crowpay.ai) → gets signed payment
4. Agent retries with payment proof → gets the API response

## Running

```bash
pnpm install
pnpm start
```

## Learn more

- [Nightmarket](https://nightmarket.ai) — API marketplace
- [CrowPay](https://crowpay.ai) — Agent payment service
- [x402 protocol](https://www.x402.org/) — HTTP 402 payment standard
