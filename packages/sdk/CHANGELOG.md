# @voltagent/sdk

## 2.0.2

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
  - @voltagent/internal@1.0.2

## 2.0.1

### Patch Changes

- [`c3943aa`](https://github.com/VoltAgent/voltagent/commit/c3943aa89a7bee113d99404ecd5a81a62bc159c2) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

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

- Updated dependencies [[`c3943aa`](https://github.com/VoltAgent/voltagent/commit/c3943aa89a7bee113d99404ecd5a81a62bc159c2)]:
  - @voltagent/core@2.0.1
  - @voltagent/internal@1.0.1

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
  - @voltagent/core@2.0.0
  - @voltagent/internal@1.0.0

## 1.0.2

### Patch Changes

- [#801](https://github.com/VoltAgent/voltagent/pull/801) [`a26ddd8`](https://github.com/VoltAgent/voltagent/commit/a26ddd826692485278033c22ac9828cb51cdd749) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add triggers DSL improvements and event payload simplification
  - Introduce the new `createTriggers` DSL and expose trigger events via sensible provider names (e.g. `on.airtable.recordCreated`) rather than raw catalog IDs.
  - Add trigger span metadata propagation so VoltAgent agents receive trigger context automatically without manual mapping.
  - Simplify action dispatch payloads: `payload` now contains only the event’s raw data while trigger context lives in the `event`/`metadata` blocks, reducing boilerplate in handlers.

  ```ts
  import { VoltAgent, createTriggers } from "@voltagent/core";

  new VoltAgent({
    // ...
    triggers: createTriggers((on) => {
      on.airtable.recordCreated(({ payload, event }) => {
        console.log("New Airtable row", payload, event.metadata);
      });

      on.gmail.newEmail(({ payload }) => {
        console.log("New Gmail message", payload);
      });
    }),
  });
  ```

- [#801](https://github.com/VoltAgent/voltagent/pull/801) [`a26ddd8`](https://github.com/VoltAgent/voltagent/commit/a26ddd826692485278033c22ac9828cb51cdd749) Thanks [@omeraplak](https://github.com/omeraplak)! - Add full Discord action coverage to `VoltOpsActionsClient`, including typed helpers for messaging, reactions, channels, and guild roles. **All VoltOps Actions now require the inline `credential` payload**—pass `{ id: "cred_xyz" }` to reuse a saved credential or provide provider-specific secrets on the fly. Each provider now has explicit credential typing (Airtable ⇒ `{ apiKey }`, Slack ⇒ `{ botToken }`, Discord ⇒ `{ botToken } | { webhookUrl }`), so editors autocomplete only the valid fields. The SDK propagates these types so apps can invoke VoltOps Actions without managing separate credential IDs.

- Updated dependencies [[`a26ddd8`](https://github.com/VoltAgent/voltagent/commit/a26ddd826692485278033c22ac9828cb51cdd749), [`a26ddd8`](https://github.com/VoltAgent/voltagent/commit/a26ddd826692485278033c22ac9828cb51cdd749)]:
  - @voltagent/core@1.2.6

## 1.0.1

### Patch Changes

- [#693](https://github.com/VoltAgent/voltagent/pull/693) [`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e) Thanks [@marinoska](https://github.com/marinoska)! - - Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
  - Upgraded dependency: `ai` → `^5.0.76`
- Updated dependencies [[`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e)]:
  - @voltagent/internal@0.0.12
  - @voltagent/core@1.1.30

## 1.0.0

### Major Changes

- [#674](https://github.com/VoltAgent/voltagent/pull/674) [`5aa84b5`](https://github.com/VoltAgent/voltagent/commit/5aa84b5bcf57d19bbe33cc791f0892c96bb3944b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add dataset/evals/experiments functions

### Patch Changes

- Updated dependencies [[`5aa84b5`](https://github.com/VoltAgent/voltagent/commit/5aa84b5bcf57d19bbe33cc791f0892c96bb3944b), [`5aa84b5`](https://github.com/VoltAgent/voltagent/commit/5aa84b5bcf57d19bbe33cc791f0892c96bb3944b)]:
  - @voltagent/core@1.1.27

## 0.1.7-next.0

### Patch Changes

- Updated dependencies [[`77a3f64`](https://github.com/VoltAgent/voltagent/commit/77a3f64dea6e8a06fbbd72878711efa9ceb90bc3)]:
  - @voltagent/core@1.1.7-next.0

## 0.1.7-next.0

### Patch Changes

- Updated dependencies [[`64a50e6`](https://github.com/VoltAgent/voltagent/commit/64a50e6800dec844fad7b9f3a3b1c2c8d0486229), [`9e8b211`](https://github.com/VoltAgent/voltagent/commit/9e8b2119a783942f114459f0a9b93e645727445e)]:
  - @voltagent/core@1.0.0-next.0

## 0.1.6

### Patch Changes

- [`90a1316`](https://github.com/VoltAgent/voltagent/commit/90a131622a876c0d91e1b9046a5e1fc143fef6b5) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: improve code quality with biome linting and package configuration enhancements

  This update focuses on improving code quality and package configuration across the entire VoltAgent monorepo:

  **Key improvements:**
  - **Biome Linting**: Fixed numerous linting issues identified by Biome across all packages, ensuring consistent code style and catching potential bugs
  - **Package Configuration**: Added `publint` script to all packages for strict validation of package.json files to ensure proper publishing configuration
  - **TypeScript Exports**: Fixed `typesVersions` structure in @voltagent/internal package and removed duplicate entries
  - **Test Utilities**: Refactored `createTrackedStorage` function in core package by simplifying its API - removed the `testName` parameter for cleaner test setup
  - **Type Checking**: Enabled `attw` (Are The Types Wrong) checking to ensure TypeScript types are correctly exported

  These changes improve the overall maintainability and reliability of the VoltAgent framework without affecting the public API.

- Updated dependencies [[`8d89469`](https://github.com/VoltAgent/voltagent/commit/8d8946919820c0298bffea13731ea08660b72c4b), [`90a1316`](https://github.com/VoltAgent/voltagent/commit/90a131622a876c0d91e1b9046a5e1fc143fef6b5), [`71500c5`](https://github.com/VoltAgent/voltagent/commit/71500c5368cce3ed4aacfb0fb2749752bf71badd), [`6cc552a`](https://github.com/VoltAgent/voltagent/commit/6cc552ada896b1a8344976c46a08b53d2b3a5743)]:
  - @voltagent/core@0.1.73

## 0.1.5

### Patch Changes

- [#213](https://github.com/VoltAgent/voltagent/pull/213) [`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f) Thanks [@baseballyama](https://github.com/baseballyama)! - chore!: drop Node.js v18

- Updated dependencies [[`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f), [`80fd3c0`](https://github.com/VoltAgent/voltagent/commit/80fd3c069de4c23116540a55082b891c4b376ce6)]:
  - @voltagent/core@0.1.31

## 0.1.4

### Patch Changes

- [#176](https://github.com/VoltAgent/voltagent/pull/176) [`790d070`](https://github.com/VoltAgent/voltagent/commit/790d070e26a41a6467927471933399020ceec275) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: initial release of VoltAgent Observability SDK

  A TypeScript SDK for monitoring AI agents and conversations with automatic event batching and structured tracing.

  **Basic Usage:**

  ```typescript
  const sdk = new VoltAgentObservabilitySDK({
    baseUrl: "https://api.voltagent.dev",
    publicKey: "your-public-key",
    secretKey: "your-secret-key",
    autoFlush: true,
    flushInterval: 3000,
  });

  const trace = await sdk.trace({
    name: "Customer Support Query",
    agentId: "support-agent-v1",
    input: { query: "How to reset password?" },
    userId: "user-123",
    conversationId: "conv-456",
  });

  const agent = await trace.addAgent({
    name: "Support Agent",
    model: "gpt-4",
    input: { query: "User needs password reset help" },
  });
  ```

  Supports nested agent workflows, custom metadata, and automatic performance metrics collection.

- Updated dependencies [[`790d070`](https://github.com/VoltAgent/voltagent/commit/790d070e26a41a6467927471933399020ceec275), [`790d070`](https://github.com/VoltAgent/voltagent/commit/790d070e26a41a6467927471933399020ceec275)]:
  - @voltagent/core@0.1.24

## 0.1.3

### Patch Changes

- [#171](https://github.com/VoltAgent/voltagent/pull/171) [`1cd2a93`](https://github.com/VoltAgent/voltagent/commit/1cd2a9307d10bf5c90083138655aca9614d8053b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: initial release of Vercel AI SDK integration

  Add support for Vercel AI SDK observability with automated tracing and monitoring capabilities.

  Documentation: https://voltagent.dev/voltops-llm-observability-docs/vercel-ai/

## 0.1.1

### Patch Changes

- [#160](https://github.com/VoltAgent/voltagent/pull/160) [`03ed437`](https://github.com/VoltAgent/voltagent/commit/03ed43723cd56f29ac67088f0624a88632a14a1b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: introduce new VoltAgent SDK package
  - Add new `@voltagent/sdk` package for client-side interactions with VoltAgent API
  - Includes VoltAgentClient for managing agents, conversations, and telemetry
  - Provides wrapper utilities for enhanced agent functionality
  - Supports TypeScript with complete type definitions

- Updated dependencies [[`03ed437`](https://github.com/VoltAgent/voltagent/commit/03ed43723cd56f29ac67088f0624a88632a14a1b)]:
  - @voltagent/core@0.1.21
