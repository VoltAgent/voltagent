# Summarization Example (VoltAgent)

Demonstrates agent summarization with a short trigger window so you can see summaries created during a single run.

## Prerequisites

- Node.js (v20 or newer)
- OpenAI API key (with access to `openai/gpt-5.1`)

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

3. Add your API key to `.env`:

   ```env
   OPENAI_API_KEY=your-api-key
   ```

4. Run the example:

   ```bash
   pnpm dev
   ```

If you do not have access to `openai/gpt-5.1`, change the model in `src/index.ts` to `openai/gpt-4o-mini` (or another available model) and remove the OpenAI reasoning options.

## What it does

- Creates a single `Agent` with `summarization` enabled.
- Enables OpenAI native reasoning by using `openai/gpt-5.1` with `providerOptions.openai.reasoningEffort`.
- Uses a low `triggerTokens` value so summaries are created quickly.
- Starts a VoltAgent server so you can chat with the agent over HTTP.

## Project structure

```
.
├── src/
│   └── index.ts  # Creates and serves the agent with summarization enabled
├── package.json
├── tsconfig.json
└── README.md
```
