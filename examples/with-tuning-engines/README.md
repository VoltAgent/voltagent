# with-tuning-engines

A [VoltAgent](https://github.com/VoltAgent/voltagent) application using Tuning Engines as a governed OpenAI-compatible endpoint.

Tuning Engines can sit between VoltAgent and the underlying model providers so that VoltAgent owns the agent runtime, tools, and memory, while Tuning Engines centralizes model access, policy checks, audit logs, traces, and usage/cost reporting.

## Getting Started

### Prerequisites

- Node.js (v20 or newer)
- npm, yarn, or pnpm
- A Tuning Engines inference key with access to the model alias you want to use

### Installation

1. Clone this repository
2. Install dependencies
3. Copy `.env.example` to `.env`
4. Set `TUNING_ENGINES_API_KEY`
5. Optionally set `TUNING_ENGINES_MODEL`

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

- `Agent` configured with `@ai-sdk/openai` and a custom `baseURL`
- Tuning Engines inference key usage via `TUNING_ENGINES_API_KEY`
- Optional model alias selection via `TUNING_ENGINES_MODEL`
- Local memory storage with LibSQL
- Hono server integration through `@voltagent/server-hono`

## Notes

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
npm create voltagent-app@latest -- --example with-tuning-engines
```
