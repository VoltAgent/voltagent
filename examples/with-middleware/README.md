# Middleware Example

This example shows input and output middleware with retry feedback.

## Scaffold

```bash
npm create voltagent-app@latest -- --example with-middleware
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

- `src/index.ts` registers input and output middlewares and enables middleware retries.
