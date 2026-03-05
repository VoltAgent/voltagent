import VoltAgent, { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

/**
 * Nightmarket + VoltAgent Example
 *
 * This example shows how to give a VoltAgent agent access to the Nightmarket
 * API marketplace (https://nightmarket.ai). The agent can search for paid
 * third-party APIs, get service details, and call them.
 *
 * Every Nightmarket call settles on-chain in USDC on Base using the x402
 * payment protocol — no API keys or subscriptions needed per service.
 */

const NIGHTMARKET_BASE = "https://nightmarket.ai/api";

// Tool: Search the Nightmarket marketplace
const searchMarketplace = createTool({
  name: "nightmarket_search",
  description:
    "Search the Nightmarket API marketplace for paid third-party services. Returns available APIs with pricing.",
  parameters: z.object({
    query: z.string().optional().describe("Search term to filter by name, description, or seller"),
    sort: z
      .enum(["popular", "newest", "price_asc", "price_desc"])
      .optional()
      .default("popular")
      .describe("Sort order for results"),
  }),
  async execute({ query, sort }) {
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (sort) params.set("sort", sort);

    const url = `${NIGHTMARKET_BASE}/marketplace${params.toString() ? `?${params}` : ""}`;
    const resp = await fetch(url);
    const services = await resp.json();

    return {
      count: services.length,
      services: services.slice(0, 10).map((s: any) => ({
        id: s._id,
        name: s.name,
        description: s.description,
        method: s.method,
        priceUsdc: s.priceUsdc,
        totalCalls: s.totalCalls,
        seller: s.seller?.companyName,
      })),
    };
  },
});

// Tool: Get full details for a specific service
const getServiceDetails = createTool({
  name: "nightmarket_details",
  description: "Get full details for a Nightmarket service including request/response examples.",
  parameters: z.object({
    endpointId: z.string().describe("The service ID from search results"),
  }),
  async execute({ endpointId }) {
    const resp = await fetch(`${NIGHTMARKET_BASE}/marketplace/${endpointId}`);
    if (!resp.ok) return { error: `Service not found (${resp.status})` };
    return await resp.json();
  },
});

// Tool: Call a Nightmarket service
const callService = createTool({
  name: "nightmarket_call",
  description:
    "Call a Nightmarket API service. First call returns 402 with payment details. After paying via CrowPay, retry with paymentSignature.",
  parameters: z.object({
    endpointId: z.string().describe("The service endpoint ID"),
    method: z
      .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
      .optional()
      .default("GET")
      .describe("HTTP method"),
    body: z.string().optional().describe("JSON request body for POST/PUT/PATCH"),
    paymentSignature: z
      .string()
      .optional()
      .describe("Base64-encoded x402 payment proof from CrowPay"),
  }),
  async execute({ endpointId, method, body, paymentSignature }) {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (paymentSignature) headers["payment-signature"] = paymentSignature;
    if (body) headers["Content-Type"] = "application/json";

    const resp = await fetch(`${NIGHTMARKET_BASE}/x402/${endpointId}`, {
      method: method || "GET",
      headers,
      body: body || undefined,
    });

    if (resp.status === 402) {
      const paymentInfo = await resp.json().catch(() => ({}));
      return {
        status: 402,
        message:
          "Payment required. Use CrowPay to authorize payment, then retry with paymentSignature.",
        paymentRequired: paymentInfo,
      };
    }

    return { status: resp.status, data: await resp.json() };
  },
});

// Create an agent with Nightmarket tools
const agent = new Agent({
  id: "nightmarket-agent",
  name: "Nightmarket Agent",
  purpose: "Discover and call paid API services from the Nightmarket marketplace",
  instructions: `You help users find and use API services from Nightmarket.

When a user needs external data or services:
1. Search the marketplace for relevant APIs
2. Show them options with pricing
3. Get full details for the service they want
4. Call the service — handle the 402 payment flow

For payments, use CrowPay (https://crowpay.ai) to authorize x402 payments.
The first call always returns 402 — this is normal x402 behavior.`,
  model: "openai/gpt-4o-mini",
  tools: [searchMarketplace, getServiceDetails, callService],
});

new VoltAgent({
  agents: {
    agent,
  },
});
