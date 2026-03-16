# with-openrouter

An [VoltAgent](https://github.com/VoltAgent/voltagent) application using OpenRouter through `@openrouter/ai-sdk-provider`.

## Getting Started

### Prerequisites

- Node.js (v20 or newer)
- npm, yarn, or pnpm
- An OpenRouter API key

### Installation

1. Clone this repository
2. Install dependencies
3. Copy `.env.example` to `.env`
4. Set `OPENROUTER_API_KEY`

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

The dev script uses `tsc --watch` and `node --watch` instead of `tsx`. In this workspace, `tsx` currently trips over the OpenRouter provider import during loader resolution, while the compiled Node path works correctly.

## What This Example Shows

- `Agent` configured with OpenRouter via `@openrouter/ai-sdk-provider`
- `usage: { include: true }` enabled on the OpenRouter model
- Local memory storage with LibSQL
- Hono server integration through `@voltagent/server-hono`

## Notes

Use `pnpm build && pnpm start` or `pnpm dev` for local testing. Both paths avoid the `tsx` loader issue and run the compiled output with Node directly.

## Project Structure

```text
.
├── src/
│   └── index.ts
├── scripts/
│   └── dev.mjs
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Try Example

```bash
npm create voltagent-app@latest -- --example with-openrouter
```
