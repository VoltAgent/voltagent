---
title: Context.dev web search
---

# Context.dev web search

The [Context.dev search example](https://github.com/VoltAgent/voltagent/tree/main/examples/with-context-search) connects an agent to live public-web search with `createTool`. The agent receives source URLs and relevant passages, then cites the sources in its answer.

## Run the example

Use Node.js 20.6 or later and the repository's pinned pnpm version.

```bash
git clone https://github.com/VoltAgent/voltagent.git
cd voltagent
pnpm install
pnpm exec lerna run build --scope voltagent-example-with-context-search --include-dependencies
cd examples/with-context-search
cp .env.example .env
```

Set `OPENAI_API_KEY` and `CONTEXT_DEV_API_KEY` in `.env`, then run `pnpm dev`. Get a Context.dev key from [context.dev](https://context.dev/).

Send the agent a public question:

```bash
curl http://localhost:3141/agents/contextSearchAgent/text \
  -H 'Content-Type: application/json' \
  -d '{"input":"Find the Python standard library documentation and cite the source."}'
```

## What the tool demonstrates

- Zod validates a public query of 1–500 characters and a result count of 10–100, defaulting to 10.
- The tool requests query-relevant Highlights and returns source URLs, titles, descriptions, Highlights status, and the `partial` flag. It excludes account and billing metadata.
- Failed Highlights keep their status without returning failed passages. Empty results stay empty, and the agent explains missing evidence. Search excerpts do not establish that the agent directly read a page.
- Native `fetch` combines the tool operation's cancellation signal with a 60-second deadline. Redirects are rejected. Errors contain a safe message or HTTP status, without response bodies or transport exception text.

The example uses existing VoltAgent tool and agent APIs. Copy the tool into your own project and register it in an agent's `tools` array; no framework adapter is required.

Calls use your Context.dev credits and OpenAI account. Queries and retrieved content pass through the agent, model provider, and any observability you configure. Use public information and keep API keys in the server environment. See the [Context Search reference](https://docs.context.dev/api-reference/web-scraping/search) for API details.
