# @voltagent/sdk

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

  Documentation: https://voltagent.dev/docs-observability/vercel-ai/

## 0.1.1

### Patch Changes

- [#160](https://github.com/VoltAgent/voltagent/pull/160) [`03ed437`](https://github.com/VoltAgent/voltagent/commit/03ed43723cd56f29ac67088f0624a88632a14a1b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: introduce new VoltAgent SDK package

  - Add new `@voltagent/sdk` package for client-side interactions with VoltAgent API
  - Includes VoltAgentClient for managing agents, conversations, and telemetry
  - Provides wrapper utilities for enhanced agent functionality
  - Supports TypeScript with complete type definitions

- Updated dependencies [[`03ed437`](https://github.com/VoltAgent/voltagent/commit/03ed43723cd56f29ac67088f0624a88632a14a1b)]:
  - @voltagent/core@0.1.21
