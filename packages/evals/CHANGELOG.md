# @voltagent/evals

## 2.0.0

### Major Changes

- [#894](https://github.com/VoltAgent/voltagent/pull/894) [`ee05549`](https://github.com/VoltAgent/voltagent/commit/ee055498096b1b99015a8362903712663969677f) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

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

### Patch Changes

- Updated dependencies [[`ee05549`](https://github.com/VoltAgent/voltagent/commit/ee055498096b1b99015a8362903712663969677f)]:
  - @voltagent/scorers@2.0.0
  - @voltagent/internal@1.0.0
  - @voltagent/sdk@2.0.0

## 1.0.4

### Patch Changes

- [#805](https://github.com/VoltAgent/voltagent/pull/805) [`ad4893a`](https://github.com/VoltAgent/voltagent/commit/ad4893a523be60cef93706a5aa6d2e0096cc306b) Thanks [@lzj960515](https://github.com/lzj960515)! - feat: add exports field to package.json for module compatibility

- Updated dependencies [[`ad4893a`](https://github.com/VoltAgent/voltagent/commit/ad4893a523be60cef93706a5aa6d2e0096cc306b)]:
  - @voltagent/scorers@1.0.2

## 1.0.3

### Patch Changes

- [#693](https://github.com/VoltAgent/voltagent/pull/693) [`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e) Thanks [@marinoska](https://github.com/marinoska)! - - Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
  - Upgraded dependency: `ai` → `^5.0.76`
- Updated dependencies [[`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e)]:
  - @voltagent/internal@0.0.12
  - @voltagent/scorers@1.0.1
  - @voltagent/sdk@1.0.1

## 1.0.2

### Patch Changes

- [`d5170ce`](https://github.com/VoltAgent/voltagent/commit/d5170ced80fbc9fd2de03bb7eaff1cb31424d618) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add runtime payload support for evals

## 1.0.1

### Patch Changes

- [#690](https://github.com/VoltAgent/voltagent/pull/690) [`c8f9032`](https://github.com/VoltAgent/voltagent/commit/c8f9032fd806efbd22da9c8bd0a10f59a388fb7b) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: allow experiment scorer configs to declare their own `id`, so `passCriteria` entries that target `scorerId` work reliably and scorer summaries use the caller-provided identifiers.

## 1.0.0

### Major Changes

- [#674](https://github.com/VoltAgent/voltagent/pull/674) [`5aa84b5`](https://github.com/VoltAgent/voltagent/commit/5aa84b5bcf57d19bbe33cc791f0892c96bb3944b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: initial release

### Patch Changes

- Updated dependencies [[`5aa84b5`](https://github.com/VoltAgent/voltagent/commit/5aa84b5bcf57d19bbe33cc791f0892c96bb3944b), [`5aa84b5`](https://github.com/VoltAgent/voltagent/commit/5aa84b5bcf57d19bbe33cc791f0892c96bb3944b)]:
  - @voltagent/scorers@1.0.0
  - @voltagent/sdk@1.0.0
