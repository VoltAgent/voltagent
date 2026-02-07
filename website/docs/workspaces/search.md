---
title: Workspace Search
slug: /workspaces/search
---

# Workspace Search

> **Note: Workspace Search is Experimental**
> The Workspace API is experimental. Expect iteration and possible breaking changes as we refine the API.

Workspace search supports BM25, vector, and hybrid modes over indexed workspace content.

## Search tools

- `workspace_index`: index files under a path + glob
- `workspace_index_content`: index raw content by path
- `workspace_search`: BM25, vector, or hybrid search

```ts
const workspace = new Workspace({
  search: {
    autoIndexPaths: [{ path: "/", glob: "**/*.{md,ts,js}" }],
    embedding: "openai:text-embedding-3-small",
    vector: new InMemoryVectorAdapter(),
  },
});
```

## Direct search API (opt-in)

Search is tool-only by default. Enable `search.allowDirectAccess` for programmatic access:

```ts
const workspace = new Workspace({
  search: {
    allowDirectAccess: true,
    autoIndexPaths: ["/notes"],
  },
});

// Index ad-hoc content
await workspace.index("/notes/extra.md", "Hello world", { source: "manual" });

// Query with hybrid search + minScore filter
const results = await workspace.search("workspace isolation", {
  mode: "hybrid",
  minScore: 0.25,
  topK: 5,
});
```

Direct calls still respect search tool policies (`enabled` / `needsApproval`).

## Snippet-only output

To reduce token usage, you can omit full content in tool output:

```ts
const results = await agent.generateText("Search notes for retention ideas.", {
  tools: {
    workspace_search: {
      query: "retention",
      include_content: false,
      snippet_length: 200,
    },
  },
});
```

## Parameters

`workspace_search` supports:

- `top_k` (default `5`)
- `min_score` (0-1)
- `snippet_length`
- `include_content` (default `true`)
- `vector_weight` (0-1)
- `lexical_weight` (defaults to `1 - vector_weight`)

## Result fields

Search results include:

- `score`: normalized score (0-1)
- `scoreDetails`: normalized `bm25` / `vector`
- `content`: full content (if `include_content`)
- `snippet`: snippet around query terms
- `lineRange`: 1-based start/end line numbers for matches

BM25 scores are normalized per result set; vector scores use cosine similarity. In hybrid mode, scores are combined using `vector_weight`.
