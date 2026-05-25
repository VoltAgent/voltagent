# Bilig WorkPaper MCP

Use VoltAgent with a local Bilig WorkPaper MCP server for formula-backed workbook automation. The example starts `@bilig/workpaper`, edits an input cell, recalculates dependent formulas, reads the computed result, and verifies persisted WorkPaper JSON.

## Try Example

```bash
npm create voltagent-app@latest -- --example with-bilig-workpaper-mcp
```

## Run The Proof

The proof script does not require an LLM key. It uses VoltAgent's `MCPConfiguration` to call the Bilig MCP tools directly.

```bash
pnpm install
pnpm proof
```

Expected result:

```json
{
  "ok": true,
  "package": "@bilig/workpaper@0.93.0",
  "recalculated": {
    "summaryB3": 96000
  },
  "persisted": true
}
```

## Run The Agent

```bash
cp .env.example .env
pnpm dev
```

Open the VoltAgent console and ask the agent to inspect the workbook, set `Inputs!B3` to `0.4`, and verify `Summary!B3`. The important pattern is read, edit, recalculate, read back, and export the persisted WorkPaper document.
