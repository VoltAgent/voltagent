# VoltAgent Netlify Functions Deployment Example

This example shows how to deploy a VoltAgent agent as a Netlify Function (Node 20 runtime) while keeping the full VoltAgent HTTP API available behind a single serverless entry point.

## Features

- ⚙️ Runs on Netlify Functions (AWS Lambda) with Node.js 20
- 🤖 Uses model strings like `openai/gpt-4o-mini` for completions
- 🧰 Includes a sample weather tool
- 🔁 `netlify.toml` redirects every route to the function so `/agents`, `/observability`, etc. continue to work

## Prerequisites

- Node.js 20+
- A Netlify account
- [`netlify-cli`](https://docs.netlify.com/cli/get-started/)
- An OpenAI API key (VoltOps keys optional)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file and add your secrets:

   ```bash
   cp example.env .env
   ```

   Netlify CLI automatically loads `.env` during `netlify dev`.

## Local development

Run the Netlify Functions emulator:

```bash
npm run dev
```

The CLI serves the function at `http://localhost:8888`. Try a few routes:

```bash
# Health check (redirect config sends it to the function)
curl http://localhost:8888/

# List agents
curl http://localhost:8888/agents

# Invoke the assistant
curl -X POST http://localhost:8888/agents/netlify-function-agent/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is the weather in Berlin?"}]
  }'
```

## Deploy to Netlify

1. Authenticate and link the project:

   ```bash
   npx netlify login
   npx netlify init
   ```

2. Store secrets in the project:

   ```bash
   npx netlify secrets:set OPENAI_API_KEY
   npx netlify secrets:set VOLTAGENT_PUBLIC_KEY
   npx netlify secrets:set VOLTAGENT_SECRET_KEY
   ```

3. Deploy:

   ```bash
   npm run deploy:preview   # staging
   npm run deploy           # production
   ```

Netlify returns the live URL when the deployment finishes.

## Project structure

```
with-netlify-functions/
├── netlify/
│   └── functions/
│       └── voltagent.ts   # Netlify Functions entry point
├── src/
│   ├── index.ts           # VoltAgent configuration
│   └── tools/index.ts     # Sample weather tool
├── netlify.toml           # Redirects every route to the function
├── package.json
├── tsconfig.json
└── example.env
```

## Notes

- Import `createNetlifyFunctionHandler` from `@voltagent/serverless-hono` to wire VoltAgent into Netlify with one line:

  ```ts
  import { createNetlifyFunctionHandler } from "@voltagent/serverless-hono";
  import { getVoltAgent } from "../src/index";

  export const handler = createNetlifyFunctionHandler(getVoltAgent());
  ```

- `netlify.toml` contains a wildcard redirect so all HTTP routes map to `/.netlify/functions/voltagent/:splat`.
- The handler converts incoming Lambda events to `Request` objects and forwards them to the VoltAgent serverless provider, so observability endpoints and VoltOps polling behave the same as the Cloudflare example.
