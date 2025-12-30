# voltagent-copilotkit-client

## 0.0.1

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
