# Public-web research with Baizhi MCP

Answer one research question by finding sources, reading the relevant pages, and extracting comparable fields with a VoltAgent agent. For example, compare the installation requirements documented on two official product sites and return a small table with source URLs.

[Baizhi Agent Toolkit](https://agent-toolkit.app.baizhi.cloud/) is a hosted, paid tool service. It is not an LLM provider. You need your own Baizhi account, API key and sufficient credits, plus your own OpenAI API key for the agent. The example code is MIT licensed; the remote service backend is not included or self-hosted by this example. Check the service's current terms and pricing before running it.

## Setup

Use Node.js 20.6 or later and pnpm. This follows the repository's Node 20 baseline; the example's `--env-file` scripts require Node 20.6. From the repository root, follow the [contribution setup](../../CONTRIBUTING.md) to install dependencies and build the workspace packages. Then:

```sh
cd examples/with-baizhi-research
cp .env.example .env
```

Fill in `BAIZHI_API_KEY` and `OPENAI_API_KEY` in `.env`, which is ignored by Git. Keep `NODE_ENV=production` to use VoltAgent's bundled model registry without its development-only models.dev refresh. No real key is needed for the offline tests.

Run a single question:

```sh
pnpm dev "Compare Node.js installation requirements from the official VoltAgent and TypeScript documentation. Cite the source for each claim."
```

The process prints its answer and exits. To run the compiled version:

```sh
pnpm build
pnpm start "Compare installation requirements from two official product sites. Cite sources."
```

The answer depends on current source pages and model behavior. Missing evidence should be reported as unknown. No example answer is presented as a verified live result.

## Tool flow and limits

The connection uses Streamable HTTP at `https://agent-toolkit.app.baizhi.cloud/mcp` with a static `Authorization: Bearer` header. It discovers available tool names at startup and exposes only these three VoltAgent tools:

| Tool               | Role                            | Inputs used by this example                                                               |
| ------------------ | ------------------------------- | ----------------------------------------------------------------------------------------- |
| `websearch_search` | Find candidate public sources   | Query, up to five results, optional domain arrays and freshness range; summaries disabled |
| `web_scrape`       | Read a source to verify claims  | One HTTP(S) URL; Markdown and no download                                                 |
| `web_extract`      | Extract fields for a comparison | One URL and a fields object and/or instruction; no download                               |

The names and input shapes were checked against the service's `tools/list` response on 2026-09-20. Discovery stops once all three tools are found, scanning at most ten pages. Reaching that limit is reported separately from a complete catalog missing a tool. The local schemas intentionally expose a smaller input surface. If the remote contract changes, update these schemas and tests before use.

Search domain restrictions are arrays of bare domains or IP addresses, such as `{ domains: ["example.com"] }`. Extraction fields are an object such as `{ version: "string", supported: "boolean" }`, not a JSON string. These inputs follow the wire contract rather than display-name aliases.

Each question shares a hard limit of six tool-call attempts, including failed attempts. Every MCP request has a 30-second timeout, and the whole run has a two-minute deadline. Ctrl+C cancels in-flight work; the connection closes in `finally`. The CLI reports user cancellation and the two-minute deadline separately from connection or credential failures. Cancellation cannot undo work already accepted by a remote service or guarantee that no credits were consumed. The limit is a request-count cap, not a monetary budget. The LLM and remote tools may each charge separately.

`src/session.ts` uses the official MCP SDK transport and VoltAgent's `createTool` so the example can apply a shared budget, propagate operation cancellation, and keep raw remote errors out of model output and logs. It rejects redirects on both POST requests and the optional GET stream. This does not require a framework change.

## Data handling

Questions, search terms, URLs and extraction instructions are sent to Baizhi when a tool is used. Retrieved content and the question are sent to the selected LLM provider. Use public source pages and avoid private information, credentials, signed URLs, and account-specific pages. The URL checks reject non-HTTP(S) URLs and embedded credentials; they are not a network isolation or SSRF defense.

The agent is instructed to treat retrieved content as evidence, cite supporting URLs, and ignore instructions found in pages. This is a prompt boundary, not a guarantee against prompt injection. Review the answer before relying on it.

The example disables agent memory, uses a silent logger, replaces literal API-key echoes in tool output and final text, and reports generic errors. It does not configure VoltOps or another telemetry exporter. These choices do not control retention by the remote service or model provider. Do not paste keys into a question, turn on verbose transport logging, or publish your `.env` file.

## Offline validation

```sh
pnpm test
pnpm typecheck
pnpm build
```

Tests use the actual MCP SDK with an in-memory protocol server and a synthetic HTTP fetch implementation. One test runs a real VoltAgent `Agent` with an AI SDK fake model through search, scrape and extraction, and checks that tool responses return to the model prompt. The remaining tests check discovery pagination, the three-tool allowlist, structured argument mapping, input rejection, secret echo/error handling, shared call limits, cancellation, cleanup and Bearer/redirect transport options. Fixtures are synthetic, not captured paid responses. Tests block real fetch calls and require no service or model credentials. They do not establish live service availability, billing behavior or the quality of an LLM-generated answer.
