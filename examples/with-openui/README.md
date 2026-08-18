# VoltAgent + OpenUI PDF RAG

This example connects [VoltAgent](https://voltagent.dev/) to
[OpenUI](https://openui.com/) in a grounded, streaming RAG chat. VoltAgent
extracts and chunks one bundled PDF, embeds the chunks in memory, retrieves the
most relevant pages for every turn, and supplies that context to the model.
OpenUI turns the grounded answer into interactive charts, forms, and follow-up
actions.

The bundled [2025 Housing Supply Report](./data/nyc-2025-housing-supply-report.pdf)
from the [New York City Rent Guidelines Board](https://rentguidelinesboard.cityofnewyork.us/research/)
is the only runtime source of housing facts. It is an official annual government
report covering calendar-year 2024. The starter prompts contain no hidden chart
values, and there is no fallback mock dataset. The bundled file was downloaded
from the Board's [official PDF](https://rentguidelinesboard.cityofnewyork.us/wp-content/uploads/2025/05/2025-HSR.pdf).

## Supported versions

The example is tested from this repository lockfile with VoltAgent
`@voltagent/core` 2.9.x, `@voltagent/rag` 1.0.x, `pdf-parse` 2.4.x, and OpenUI
`@openuidev/react-ui` 0.13.x, `@openuidev/react-lang` 0.2.x, and
`@openuidev/react-headless` 0.9.x.

## Run it

From the repository root:

```bash
pnpm install
cp examples/with-openui/.env.example examples/with-openui/.env
# Add your OPENAI_API_KEY to examples/with-openui/.env
pnpm --filter voltagent-example-with-openui dev
```

Open [http://localhost:3000](http://localhost:3000). `VOLTAGENT_MODEL` defaults
to `openai/gpt-4o-mini`, and `VOLTAGENT_EMBEDDING_MODEL` defaults to
`text-embedding-3-small`. Both accept bare OpenAI model IDs; the chat setting
also accepts an `openai/` prefix.

The API key, PDF parsing, embeddings, and retrieval all stay server-side. Do
not expose the key with a `NEXT_PUBLIC_` prefix.

## Architecture

```text
data/nyc-2025-housing-supply-report.pdf
  -> pdf-parse page extraction (once, lazily)
  -> @voltagent/rag RecursiveChunker
  -> OpenAI embeddings cached in memory

AgentInterface user/action
  -> POST /api/chat with the full thread and threadId
  -> VoltAgent Agent.streamText()
  -> NycHousingPdfRetriever vector search
  -> retrieved page context injected by VoltAgent
  -> model emits source-grounded OpenUI Lang
  -> OpenAI-compatible SSE
  -> OpenUI adapter -> parser -> AgentInterface renderer
```

`voltagent/pdf-retriever.ts` extends VoltAgent's `BaseRetriever`. Its index is
created on the first request and reused for the life of the server process. It
ranks chunks semantically, then expands the best matches back to their complete
PDF pages so multi-column tables and map labels remain intact. VoltAgent injects
those pages, the report title, and exact page numbers into the agent's prompt as
relevant context. No vector database is required for this small,
single-document demo.

`openui/library.ts` exports the same `openuiChatLibrary` used by the renderer.
The OpenUI CLI generates `openui/generated/system-prompt.txt` from that file,
and the VoltAgent agent reads the generated prompt on the server. Regenerate it
after changing the library:

```bash
pnpm --filter voltagent-example-with-openui generate:prompt
```

The `AgentInterface` keeps its built-in `ThemeProvider` enabled and applies a
visible VoltAgent-green dark theme. Its built-in `ContinueConversation` action
adapter sends a `FollowUpItem` label or `@ToAssistant` form action back through
the same `/api/chat` route. Form state is serialized into the user message
context, so VoltAgent receives the values the user actually edited.

## Replace the datasource

To use a different source of truth:

1. Replace `data/nyc-2025-housing-supply-report.pdf` with your PDF.
2. Update the report filename, title, publisher, source URL, and domain-specific agent rules.
3. Restart the server so the lazy in-memory index is rebuilt.

For a larger or frequently changing document collection, move chunk embeddings
to a persistent vector store and invalidate the index when documents change.
In production, also add authentication and rate limiting to `/api/chat`, use a
real user identifier, configure durable conversation memory, and treat uploaded
PDF text as untrusted input.

## Acceptance prompts

Chart:

> Using only the official 2025 Housing Supply Report PDF, show 2024 residential
> building permits for all five New York City boroughs as a labeled bar chart.
> Cite the source page and end with two relevant follow-up suggestions.

The chart should show Bronx `3,125`, Brooklyn `6,588`, Manhattan `2,347`, Queens
`3,240`, and Staten Island `326` dwelling units, citing PDF page 6. Those values
must come from retrieval, not the prompt.

Click either rendered follow-up. Its exact label should appear as one new user
turn and produce one new VoltAgent request in the same conversation.

Analysis:

> Using only the official source report, explain the most important 2024 housing
> supply and vacancy signals, including where borough trends diverged. Cite
> source pages and end with two next questions.

Form:

> Create a validated housing analysis form with required focus area and audience
> fields plus notes. Add a primary Analyze button that sends the completed
> values to you.

Leave required fields empty to see validation. Then submit focus area
`Vacancy rates`, audience `City planners`, and notes
`Compare borough differences`. The next rendered answer should acknowledge the
focus area and audience, then use only facts retrieved from the PDF.

## Checks

```bash
pnpm --filter voltagent-example-with-openui generate:prompt
pnpm --filter voltagent-example-with-openui typecheck
pnpm --filter voltagent-example-with-openui lint
pnpm --filter voltagent-example-with-openui test
pnpm --filter voltagent-example-with-openui build
```
