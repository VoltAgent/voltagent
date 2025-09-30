<div align="center">
  <a href="https://voltagent.dev/">
    <img width="1800" alt="VoltAgent WhatsApp Example" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
  </a>

  <br />
  <br />

  <div align="center">
    <a href="https://voltagent.dev">Home Page</a> |
    <a href="https://voltagent.dev/docs/">Documentation</a> |
    <a href="https://github.com/VoltAgent/voltagent/tree/main/examples">Examples</a> |
    <a href="https://s.voltagent.dev/discord">Discord</a> |
    <a href="https://voltagent.dev/blog/">Blog</a>
  </div>
</div>

<br />

<div align="center">
  <strong>VoltAgent is an open-source TypeScript framework for building and orchestrating AI agents.</strong><br />
  Escape the limits of no-code builders and the complexity of starting from scratch.
  <br /><br />
</div>

<div align="center">

[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)

</div>

<br />

## WhatsApp AI Agent Order Chatbot Example

This example shows how to build a WhatsApp ordering assistant with VoltAgent. The bot uses VoltAgent tools to list menu items, collect order details, capture delivery addresses, and persist the full order in Supabase while keeping the conversation stateful.

## Try the Example

```bash
npm create voltagent-app@latest -- --example with-whatsapp
```

## Highlights

- **WhatsApp Cloud API Integration** – Handles webhook verification, message parsing, and replies using Meta's API.
- **Supabase Back-End** – Stores menu items, orders, and order line items with transactional inserts and indexes ready to go.
- **Stateful Conversations** – Uses VoltAgent working memory so the assistant remembers cart items and addresses across messages.
- **Typed Tools** – Three VoltAgent tools (list menu, create order, check status) modeled with Zod schemas for safe inputs/outputs.
- **VoltOps Observability** – Optional VoltOps client provides live traces and debugging without extra instrumentation.

## Prerequisites

- Node.js 20.19.0 or later
- pnpm (recommended) or npm/yarn
- WhatsApp Business Cloud API access (Meta developer account + phone number ID)
- Supabase project (URL + anon key)
- OpenAI API key (or configure another supported LLM provider)

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   # or npm install / yarn install
   ```

2. **Configure environment variables** – Create a `.env` file in this directory:

   ```env
   OPENAI_API_KEY=your_openai_api_key
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   WHATSAPP_WEBHOOK_TOKEN=your_webhook_verification_token
   WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
   WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id

   # Optional VoltOps keys
   # VOLTAGENT_PUBLIC_KEY=your_public_key
   # VOLTAGENT_SECRET_KEY=your_secret_key
   ```

3. **Seed Supabase** – Run the SQL statements in `website/examples/whatsapp-order.md` (Menu Items, Orders, Order Items tables + sample data) to create schema and starter menu items.

4. **Verify WhatsApp integration** – Follow Meta's [Cloud API onboarding guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started) to register your webhook URL, confirm the verification token, and generate the access token and phone number ID used above.

## Running Locally

```bash
pnpm dev
# or npm run dev / yarn dev
```

The agent listens on `http://localhost:3141`. When VoltOps keys are set, the VoltOps console (`https://console.voltagent.dev`) connects automatically for live traces.

## Key Files

```
examples/with-whatsapp/
├── src/
│   ├── index.ts              # Agent + server wiring
│   ├── tools/
│   │   ├── index.ts          # Exports the tools
│   │   ├── list-menu-items.ts
│   │   ├── create-order.ts
│   │   └── check-order-status.ts
│   └── webhooks/
│       └── whatsapp.ts       # WhatsApp webhook handlers
├── package.json
├── tsconfig.json
└── .env.example
```

## Workflow Overview

1. **List Menu Items** – The bot fetches menu items from Supabase when the customer asks for the menu or starts a new order.
2. **Collect Cart Items** – Working memory accumulates the chosen items, quantities, and customer notes across messages.
3. **Capture Delivery Address** – Once the customer is done ordering, the assistant prompts for an address and stores it in memory.
4. **Create Order** – The `createOrder` tool writes the order + order items to Supabase and responds with an order confirmation.
5. **Check Status** – Customers can ask “Where is my order?” and the `checkOrderStatus` tool retrieves recent orders filtered by phone number.

## WhatsApp Webhook Flow

- `GET /webhook/whatsapp` – Responds to Meta's verification challenge using `WHATSAPP_WEBHOOK_TOKEN`.
- `POST /webhook/whatsapp` – Parses inbound messages, routes text messages to the VoltAgent assistant, and sends responses with the Cloud API.
- All webhook responses return `200` to satisfy Meta's retry requirements.

## Resources

- [VoltAgent Documentation](https://voltagent.dev/docs/)
- [Examples Directory](https://github.com/VoltAgent/voltagent/tree/main/examples)
- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Supabase Docs](https://supabase.com/docs)

---

<div align="center">
  <p>Built with ❤️ using <a href="https://voltagent.dev">VoltAgent</a></p>
</div>
