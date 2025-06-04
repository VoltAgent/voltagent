# @voltagent/vercel-ai-exporter

## 0.1.4

### Patch Changes

- [`7c28c1e`](https://github.com/VoltAgent/voltagent/commit/7c28c1ee7a11da0e5ca32c248e412cc588e7fcdf) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: the default base URL setting to `https://api.voltagent.dev`

## 0.1.3

### Patch Changes

- [#176](https://github.com/VoltAgent/voltagent/pull/176) [`790d070`](https://github.com/VoltAgent/voltagent/commit/790d070e26a41a6467927471933399020ceec275) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: resolve displayName issue in agent events

  Fixed an issue where the displayName property was not being properly handled in agent events, ensuring consistent agent identification across the system.

- Updated dependencies [[`790d070`](https://github.com/VoltAgent/voltagent/commit/790d070e26a41a6467927471933399020ceec275), [`790d070`](https://github.com/VoltAgent/voltagent/commit/790d070e26a41a6467927471933399020ceec275), [`790d070`](https://github.com/VoltAgent/voltagent/commit/790d070e26a41a6467927471933399020ceec275)]:
  - @voltagent/core@0.1.24
  - @voltagent/sdk@0.1.4

## 0.1.2

### Patch Changes

- [#171](https://github.com/VoltAgent/voltagent/pull/171) [`1cd2a93`](https://github.com/VoltAgent/voltagent/commit/1cd2a9307d10bf5c90083138655aca9614d8053b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: initial release of Vercel AI SDK integration

  Add support for Vercel AI SDK observability with automated tracing and monitoring capabilities.

  Documentation: https://voltagent.dev/docs-observability/vercel-ai/

- Updated dependencies [[`1cd2a93`](https://github.com/VoltAgent/voltagent/commit/1cd2a9307d10bf5c90083138655aca9614d8053b)]:
  - @voltagent/sdk@0.1.3

## 0.1.1

### Patch Changes

- [#160](https://github.com/VoltAgent/voltagent/pull/160) [`03ed437`](https://github.com/VoltAgent/voltagent/commit/03ed43723cd56f29ac67088f0624a88632a14a1b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add Vercel AI SDK observability exporter

  - Introduce new `@voltagent/vercel-ai-exporter` package for Vercel AI SDK integration
  - Provides OpenTelemetry exporter for VoltAgent observability
  - Enables comprehensive tracking of LLM operations and multi-agent workflows
  - Includes automatic telemetry collection and agent history management

- Updated dependencies [[`03ed437`](https://github.com/VoltAgent/voltagent/commit/03ed43723cd56f29ac67088f0624a88632a14a1b), [`03ed437`](https://github.com/VoltAgent/voltagent/commit/03ed43723cd56f29ac67088f0624a88632a14a1b)]:
  - @voltagent/core@0.1.21
  - @voltagent/sdk@0.1.1
