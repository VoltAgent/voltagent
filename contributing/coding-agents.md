# Coding Agents

VoltAgent supports coding agents through shared repository instructions and ignored local configuration.

## Quick Reference

- Keep `AGENTS.md` as the source of truth for shared coding-agent instructions.
- Add nested `AGENTS.md` files only for major package areas where local context materially helps.
- Run `./scripts/sync-agent-instructions.mjs` after adding or moving instruction files.

## Guidelines

`AGENTS.md` is the source of truth for coding-agent instructions. Add shared guidance there, or in nested `AGENTS.md` files for major package areas where local context materially helps.

Some coding agents may require a different instruction filename. Keep those files as symlinks to the nearest `AGENTS.md` file instead of duplicating instruction content.

| Agent/tool                          | Support   | Instruction file         |
| ----------------------------------- | --------- | ------------------------ |
| Codex                               | Native    | `AGENTS.md`              |
| Cursor                              | Native    | `AGENTS.md`              |
| Other `AGENTS.md`-compatible agents | Native    | `AGENTS.md`              |
| Claude Code                         | Symlinked | `CLAUDE.md -> AGENTS.md` |

## Useful Links

- [Contributor docs index](./README.md)
- [Root coding-agent instructions](../AGENTS.md)
- [LLM documentation index](../website/static/llms.txt)
- [Website docs app](../website/README.md)

## Local Agent Config

Per-developer agent and IDE config is ignored by git. You can safely create local files for your own setup without committing them:

- `.agents/`
- `.claude`
- `.codex/`
- `.cursor/`
- `.windsurf/`
- `.vscode/`
- `.mcp.json`

Common local MCP config locations include `.cursor/mcp.json`, `.windsurf/mcp.json`, `.vscode/mcp.json`, and root `.mcp.json`. Root `mcp.json` is not ignored; use `.mcp.json` for private root-level MCP config.

Do not commit local credentials, personal MCP server paths, local model settings, or machine-specific tool permissions.

## Syncing Aliases

Run this after adding or moving instruction files:

```bash
./scripts/sync-agent-instructions.mjs
```

The sync script creates missing instruction-file aliases for coding agents that do not read `AGENTS.md` directly. It prints the symlinks first and asks for confirmation unless you pass `--yes`.

## Related Docs

- [Contributor docs index](./README.md)
- [Root coding-agent instructions](../AGENTS.md)
