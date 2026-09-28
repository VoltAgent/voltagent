# with-edenai

A [VoltAgent](https://github.com/VoltAgent/voltagent) application using Eden AI, an EU-based OpenAI-compatible LLM gateway, through the built-in model registry.

## Getting Started

### Prerequisites

- Node.js (v20 or newer)
- npm, yarn, or pnpm
- An Eden AI API key

### Installation

1. Clone this repository
2. Install dependencies
3. Copy `.env.example` to `.env`
4. Set `EDENAI_API_KEY`

```bash
npm install
# or
yarn
# or
pnpm install
```

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

The example starts a VoltAgent server on port `3141`.

The dev script uses `tsx watch --env-file=.env ./src`, matching the example's `package.json` setup.

## What This Example Shows

- `Agent` configured with Eden AI via a built-in `edenai/<vendor>/<model>` model string
- Model routing through Eden AI's OpenAI-compatible API (`https://api.edenai.run/v3`)
- Local memory storage with LibSQL
- Hono server integration through `@voltagent/server-hono`

## Notes

Eden AI model ids are vendor-prefixed, e.g. `openai/gpt-4o-mini`, `anthropic/claude-haiku-4-5` or `mistral/mistral-small-latest`, so the full model string is `edenai/<vendor>/<model>`. Set `EDENAI_BASE_URL=https://api.eu.edenai.run/v3` for EU data residency.

Use `pnpm build && pnpm start` for the compiled output, or `pnpm dev` during development.

## Project Structure

```text
.
├── src/
│   └── index.ts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Try Example

```bash
npm create voltagent-app@latest -- --example with-edenai
```
