# Retries and Fallbacks Example

This example configures a fallback model list with per-model and agent-level retry settings.

## Scaffold

```bash
npm create voltagent-app@latest -- --example with-retries-fallback
```

## Run

1. Set `OPENAI_API_KEY` in `.env`.
2. Install dependencies:

```bash
pnpm install
```

3. Start the dev server:

```bash
pnpm dev
```

## Files

- `src/index.ts` sets `model` to a list and configures `maxRetries`.
