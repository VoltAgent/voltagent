# VoltAgent MCP Elicitation Example

This example shows how to handle MCP `elicitation/create` requests from a VoltAgent MCP server while running a VoltAgent `generateText` call.

## Prerequisites

- Node.js 18+
- OpenAI API key

## Setup

```bash
pnpm install
```

Copy the example environment file and add your API key:

```bash
cp .env.example .env
```

Edit `.env`:

```
OPENAI_API_KEY=your_openai_api_key_here
```

## Run

```bash
pnpm dev
```

From the repo root you can also run:

```bash
pnpm --filter voltagent-example-with-mcp-elicitation dev
```

## What It Does

- Starts a VoltAgent MCP server on `http://localhost:3142/mcp/mcp-elicitation-example/mcp`.
- Registers a `customer_delete` tool that requests user confirmation via `elicitation/create`.
- Runs a VoltAgent `generateText` call with an `elicitation` handler that accepts the request and returns `{ confirm: true }`.

The console output will show the full elicitation request payload and the final agent response.
