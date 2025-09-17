# Linting

VoltAgent uses Biome for linting and formatting code. Biome is a fast and modern linter and formatter for TypeScript and JavaScript that has set of pre-defined rules that are applied to the codebase.

## Tools

- **Linter + Formatter**: Biome (replaces ESLint + Prettier)
- **Config**: `biome.json`

## Running Commands

```bash
# Check all files
pnpm lint

# Auto-fix issues
pnpm lint:fix

# Check only (CI mode)
pnpm lint:ci
```

## VS Code Integration

Install the Biome extension:

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true
}
```
