# Linting

VoltAgent uses Biome for TypeScript and JavaScript linting and formatting. Markdown and MDX files are formatted with Prettier through lint-staged.

## Quick Reference

- **TS/JS linter + formatter**: Biome
- **Markdown/MDX formatter**: Prettier
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

## Related Docs

- [Development tooling](./tooling.md)
- [Testing](./testing.md)
