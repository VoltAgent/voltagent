# Context.dev Search

A VoltAgent agent that searches the public web with Context.dev and cites the sources in its answer. The tool uses native `fetch`, Zod input and output schemas, and the agent's cancellation signal.

## Run

Use Node.js 20.6 or later and the repository's pinned pnpm version.

```bash
# From the repository root
pnpm install
pnpm exec lerna run build --scope voltagent-example-with-context-search --include-dependencies
cd examples/with-context-search
cp .env.example .env
# Set OPENAI_API_KEY and CONTEXT_DEV_API_KEY in .env
pnpm dev
```

Open the local VoltAgent server at `http://localhost:3141` and ask the agent a public question, such as “Find the Python standard library documentation and cite the source.” The startup log links to the VoltOps developer console, where you can inspect tool calls.

You can also call the agent directly:

```bash
curl http://localhost:3141/agents/contextSearchAgent/text \
  -H 'Content-Type: application/json' \
  -d '{"input":"Find the Python standard library documentation and cite the source."}'
```

## Search behavior

- `query` accepts 1–500 characters. `numResults` defaults to 10 and accepts 10–100.
- Each request asks Context.dev for Highlights. Results retain source URLs, titles, descriptions, Highlights status, and the response's `partial` flag. Account and billing metadata are excluded from the tool output.
- Empty results remain empty. Failed Highlights remain distinguishable from usable passages. Search excerpts do not establish that the agent directly read a page.
- Requests have a 60-second deadline and stop when the agent operation is cancelled. Redirects are rejected. Errors report a safe message or HTTP status without reflecting response bodies or transport exception text.

Get a Context.dev key from [context.dev](https://context.dev/). Calls use that account's credits, and model calls use your OpenAI account. Public queries and retrieved content pass through the agent, model provider, and any observability you configure; use this example for public information. See the [Context Search reference](https://docs.context.dev/api-reference/web-scraping/search) for API behavior.
