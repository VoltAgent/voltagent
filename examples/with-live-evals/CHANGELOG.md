# example-with-live-evals

## 0.0.5

### Patch Changes

- [`f6ffb8a`](https://github.com/VoltAgent/voltagent/commit/f6ffb8ae0fd95fbe920058e707d492d8c21b2505) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

- Updated dependencies [[`f6ffb8a`](https://github.com/VoltAgent/voltagent/commit/f6ffb8ae0fd95fbe920058e707d492d8c21b2505)]:
  - @voltagent/core@2.0.2
  - @voltagent/scorers@2.0.2
  - @voltagent/server-hono@2.0.2

## 0.0.4

### Patch Changes

- Updated dependencies [[`ee05549`](https://github.com/VoltAgent/voltagent/commit/ee055498096b1b99015a8362903712663969677f)]:
  - @voltagent/scorers@2.0.0
  - @voltagent/core@2.0.0
  - @voltagent/server-hono@2.0.0

## 0.0.3

### Patch Changes

- [#693](https://github.com/VoltAgent/voltagent/pull/693) [`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e) Thanks [@marinoska](https://github.com/marinoska)! - - Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
  - Upgraded dependency: `ai` → `^5.0.76`
- Updated dependencies [[`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e)]:
  - @voltagent/server-hono@1.0.22
  - @voltagent/scorers@1.0.1
  - @voltagent/core@1.1.30

## 0.0.2

### Patch Changes

- Updated dependencies [[`5aa84b5`](https://github.com/VoltAgent/voltagent/commit/5aa84b5bcf57d19bbe33cc791f0892c96bb3944b), [`5aa84b5`](https://github.com/VoltAgent/voltagent/commit/5aa84b5bcf57d19bbe33cc791f0892c96bb3944b), [`5aa84b5`](https://github.com/VoltAgent/voltagent/commit/5aa84b5bcf57d19bbe33cc791f0892c96bb3944b)]:
  - @voltagent/scorers@1.0.0
  - @voltagent/core@1.1.27
