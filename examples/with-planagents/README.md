# PlanAgents Quickstart (VoltAgent)

Build a PlanAgent with planning, file system tools, and subagent support. This example mirrors the original PlanAgents quickstart but uses VoltAgent's `PlanAgent` class.

## Prerequisites

- Node.js (v20 or newer)
- OpenAI API key
- Tavily API key

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

3. Add your API keys to `.env`:

   ```env
   OPENAI_API_KEY=your-api-key
   TAVILY_API_KEY=your-tavily-api-key
   ```

4. Run the example:

   ```bash
   pnpm dev
   ```

### Observability summary demo

To see PlanAgent summaries in the observability UI, you can seed a realistic conversation on startup:

```bash
PLANAGENT_DEMO=true pnpm dev
```

This will generate a multi-step research conversation that triggers summarization and creates `summary` spans in the flow view.

## What it does

- Creates a PlanAgent with `new PlanAgent(...)`, which enables planning (`write_todos`), file system tools, and task-based subagents by default.
- Adds a Tavily-backed `internet_search` tool for research.
- Starts a VoltAgent server so you can chat with the agent over HTTP.

## Project structure

```
.
├── src/
│   ├── index.ts  # Creates and serves the PlanAgent
│   └── tools.ts  # Tavily-powered internet search tool
├── package.json
├── tsconfig.json
└── README.md
```
