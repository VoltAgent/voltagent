<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="VoltAgent Banner" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
</a>

<br />
<br />

<div align="center">
    <a href="https://voltagent.dev">Home Page</a> |
    <a href="https://voltagent.dev/docs/">Documentation</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a> |
    <a href="https://s.voltagent.dev/discord">Discord</a> |
    <a href="https://voltagent.dev/blog/">Blog</a>
</div>
</div>

<br />

<div align="center">
    <strong>VoltAgent is an open source TypeScript framework for building and orchestrating AI agents.</strong><br>
Escape the limitations of no-code builders and the complexity of starting from scratch.
    <br />
    <br />
</div>

<div align="center">
    
[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](../../CODE_OF_CONDUCT.md)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)
    
</div>

<br />

<div align="center">
<a href="https://voltagent.dev/">
<img width="896" alt="VoltAgent Schema" src="https://github.com/user-attachments/assets/f0627868-6153-4f63-ba7f-bdfcc5dd603d" />
</a>
</div>

# VoltAgent + VoltOps Actions + Airtable

This example shows how to expose **VoltOps Actions** as VoltAgent tools so your agent can create and read Airtable records on demand. The agent uses the standard `createTool` helper, but under the hood each tool forwards the request to the VoltOps Actions API. That means you get type-safe Airtable integration (create / list records) without having to build a custom REST client.

## What You’ll Build

- A single VoltAgent powered by OpenAI’s `gpt-4o-mini`.
- VoltOps-integrated tools for every Airtable action:
  - `listAirtableRecords`
  - `createAirtableRecord`
  - `updateAirtableRecord`
  - `deleteAirtableRecord`
  - `getAirtableRecord`
- A shared VoltOps Actions client configured with your Volt console keys & Airtable credential.

### Prerequisites

1. Create (or pick) an Airtable base & table.
2. Connect Airtable inside the [Volt console](https://console.voltagent.dev) and note the **credential ID**.
3. Grab your Volt **public** and **secret** API keys, plus the Airtable **base** and **table** IDs.

## Try the Example

```bash
npm create voltagent-app@latest -- --example with-voltagent-actions
```

## Manual Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create a `.env` file (copy from the snippet below).

```bash
cp .env.example .env
```

3. Run the agent:

```bash
pnpm dev
```

Open [http://localhost:3141](http://localhost:3141) and start a new session. Ask things like _“Add Ada Lovelace to the workspace table”_ or _“List the last five onboarding records”_.

### `.env` Template

```bash
VOLT_API_BASE_URL=https://api.voltagent.dev
VOLT_PUBLIC_KEY=pk_xxx
VOLT_SECRET_KEY=sk_xxx

# Airtable action defaults
AIRTABLE_CREDENTIAL_ID=cred_xxx
AIRTABLE_BASE_ID=appxxxxxxxxxxxxxx
AIRTABLE_TABLE_ID=tblxxxxxxxxxxxxxx

# Optional: associate action runs with a Volt project
VOLTOPS_PROJECT_ID=proj_xxx
```

Any missing required value will throw during startup so you don’t accidentally run with an incomplete configuration.

## Project Structure

```
with-voltagent-actions
├── src
│   ├── config.ts              # Loads env variables & instantiates the VoltOps Actions client
│   ├── index.ts               # Creates the agent and wires up the VoltAgent server
│   └── tools
│       └── airtable.ts        # createTool definitions that call VoltOps actions
├── package.json
├── tsconfig.json
└── README.md
```

## Key Ideas

- VoltOps Actions give you hosted, observable integrations. You call them through the SDK (`@voltagent/sdk`), but the experience inside the agent feels like any other Volt tool.
- You can reuse the same pattern for Gmail, Slack, GitHub, etc. – just swap the action ID and parameters.
- Tools return rich metadata (request + response payloads) so you can inspect what happened or feed it back into the conversation.

Happy building! 🎉
