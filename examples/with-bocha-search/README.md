# VoltAgent with Bocha Web Search

This example shows how to add Bocha Web Search to a VoltAgent agent as a typed tool. The agent can search the web for current, source-linked results and use those results to answer user questions.

## Features

- Web search through Bocha's search API
- Source-linked results with title, URL, snippet, source, and published date
- Optional freshness, result count, include-domain, and exclude-domain controls
- Clear missing-key and API error messages
- Unit-tested request and response mapping helpers

## Prerequisites

1. A Bocha Search API key.
2. An OpenAI API key for the agent model.

## Setup

Install dependencies from the repository root:

```bash
pnpm install
```

Copy the example environment file:

```bash
cp examples/with-bocha-search/.env.example examples/with-bocha-search/.env
```

Then set your keys:

```env
OPENAI_API_KEY=your_actual_openai_api_key
BOCHA_SEARCH_API_KEY=your_actual_bocha_search_api_key
BOCHA_SEARCH_API_URL=https://api.bochaai.com/v1/web-search
```

`BOCHA_SEARCH_API_URL` is optional. The example defaults to the URL shown above.

## Run

```bash
pnpm --filter voltagent-example-with-bocha-search dev
```

The agent runs on VoltAgent's default local server and exposes a `searchAgent` with the `bochaSearch` tool.

## Example Queries

- "Search the web for the latest TypeScript agent framework news."
- "Find recent information about VoltAgent and summarize the sources."
- "Search only github.com for Bocha web search integrations."
- "Find current AI agent framework announcements from the last week."

## Tool Parameters

The `bochaSearch` tool accepts:

- `query`: Search query string.
- `count`: Number of results to return, default 5 and maximum 10.
- `freshness`: Optional Bocha freshness value such as `noLimit` or `oneWeek`.
- `includeDomains`: Optional domains to include.
- `excludeDomains`: Optional domains to exclude.

## Validation

Run the focused tests:

```bash
pnpm exec vitest run --config examples/with-bocha-search/vitest.config.ts
```

Build the example:

```bash
pnpm --filter voltagent-example-with-bocha-search build
```

No real API keys are committed. Configure `BOCHA_SEARCH_API_KEY` only in your local environment.
