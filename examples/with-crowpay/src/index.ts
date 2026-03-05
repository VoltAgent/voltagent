import VoltAgent, { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

/**
 * CrowPay + VoltAgent Example
 *
 * This example shows how to give a VoltAgent agent the ability to pay for
 * APIs and services autonomously using CrowPay (https://crowpay.ai).
 *
 * CrowPay provides managed wallets with spending rules, human approval
 * workflows, and audit trails. Supports x402 (USDC on Base) and credit
 * card payments.
 */

const CROWPAY_BASE = "https://api.crowpay.ai";

// Tool: Set up a new agent wallet
const setupWallet = createTool({
  name: "crowpay_setup",
  description:
    "Create a new CrowPay agent wallet and API key. The API key is shown only once! User must visit the claimUrl to set spending rules.",
  parameters: z.object({}),
  async execute() {
    const resp = await fetch(`${CROWPAY_BASE}/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    return await resp.json();
  },
});

// Tool: Authorize an x402 payment
const authorizePayment = createTool({
  name: "crowpay_authorize",
  description:
    "Authorize an x402 payment (USDC on Base). Forward the 402 response body from an API here. Returns signed payment proof or pending approval status.",
  parameters: z.object({
    apiKey: z.string().describe("CrowPay API key (crow_sk_...)"),
    paymentRequired: z
      .string()
      .describe("The full HTTP 402 response body as a JSON string"),
    merchant: z.string().describe("Human-readable name of the service"),
    reason: z.string().describe("Why the payment is needed"),
  }),
  async execute({ apiKey, paymentRequired, merchant, reason }) {
    const resp = await fetch(`${CROWPAY_BASE}/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        paymentRequired: JSON.parse(paymentRequired),
        merchant,
        reason,
        platform: "VoltAgent",
      }),
    });

    const data = await resp.json();

    if (resp.status === 200) {
      // Auto-approved — base64 encode for payment-signature header
      const signature = Buffer.from(JSON.stringify(data)).toString("base64");
      return { approved: true, paymentSignature: signature, raw: data };
    }
    if (resp.status === 202) {
      return { pending: true, approvalId: data.approvalId, message: "Needs human approval. Poll status." };
    }
    return { denied: true, ...data };
  },
});

// Tool: Authorize a credit card payment
const authorizeCard = createTool({
  name: "crowpay_card",
  description:
    "Authorize a credit card payment via CrowPay. Returns an SPT token for Stripe payment.",
  parameters: z.object({
    apiKey: z.string().describe("CrowPay API key (crow_sk_...)"),
    amountCents: z.number().int().positive().describe("Amount in cents (1000 = $10.00)"),
    merchant: z.string().describe("Merchant name"),
    reason: z.string().describe("Why the payment is needed"),
  }),
  async execute({ apiKey, amountCents, merchant, reason }) {
    const resp = await fetch(`${CROWPAY_BASE}/authorize/card`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ amountCents, merchant, reason, platform: "VoltAgent" }),
    });
    return await resp.json();
  },
});

// Tool: Poll approval status
const pollStatus = createTool({
  name: "crowpay_status",
  description: "Poll for the status of a pending CrowPay approval. Call every 3 seconds.",
  parameters: z.object({
    apiKey: z.string().describe("CrowPay API key"),
    approvalId: z.string().describe("Approval ID from a 202 response"),
  }),
  async execute({ apiKey, approvalId }) {
    const resp = await fetch(`${CROWPAY_BASE}/authorize/status?id=${approvalId}`, {
      headers: { "X-API-Key": apiKey },
    });
    return await resp.json();
  },
});

// Create an agent with CrowPay tools
const agent = new Agent({
  id: "crowpay-agent",
  name: "CrowPay Agent",
  purpose: "Handle payments for APIs and services using CrowPay managed wallets",
  instructions: `You help users set up and manage agent payments via CrowPay.

CrowPay gives agents a wallet with spending rules:
- Default: auto-approve under $5, human approval above, $50/day limit
- Supports x402 (USDC on Base) and credit card payments
- No private keys exposed to the agent

When an API returns 402 Payment Required:
1. Forward the 402 body to crowpay_authorize
2. If approved (200): use the paymentSignature to retry the original request
3. If pending (202): poll crowpay_status every 3 seconds for human approval
4. If denied (403): inform the user — spending rules blocked it

Dashboard: https://crowpay.ai/dashboard`,
  model: "openai/gpt-4o-mini",
  tools: [setupWallet, authorizePayment, authorizeCard, pollStatus],
});

new VoltAgent({
  agents: {
    agent,
  },
});
