# @voltagent/anthropic-ai

## 0.1.8

### Patch Changes

- [#149](https://github.com/VoltAgent/voltagent/pull/149) [`0137a4e`](https://github.com/VoltAgent/voltagent/commit/0137a4e67deaa2490b4a07f9de5f13633f2c473c) Thanks [@VenomHare](https://github.com/VenomHare)! - Added JSON schema support for REST API `generateObject` and `streamObject` functions. The system now accepts JSON schemas which are internally converted to Zod schemas for validation. This enables REST API usage where Zod schemas cannot be directly passed. #87

  Additional Changes:

  - Included the JSON schema from `options.schema` in the system message for the `generateObject` and `streamObject` functions in both `anthropic-ai` and `groq-ai` providers.
  - Enhanced schema handling to convert JSON schemas to Zod internally for seamless REST API compatibility.

- Updated dependencies [[`0137a4e`](https://github.com/VoltAgent/voltagent/commit/0137a4e67deaa2490b4a07f9de5f13633f2c473c), [`4308b85`](https://github.com/VoltAgent/voltagent/commit/4308b857ab2133f6ca60f22271dcf30bad8b4c08)]:
  - @voltagent/core@0.1.22

## 0.1.7

### Patch Changes

- [#155](https://github.com/VoltAgent/voltagent/pull/155) [`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c) Thanks [@baseballyama](https://github.com/baseballyama)! - chore: update `tsconfig.json`'s `target` to `ES2022`

- [#162](https://github.com/VoltAgent/voltagent/pull/162) [`b164bd0`](https://github.com/VoltAgent/voltagent/commit/b164bd014670452cb162b388f03565db992767af) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: pin zod version to 3.24.2 to avoid "Type instantiation is excessively deep and possibly infinite" error

  Fixed compatibility issues between different zod versions that were causing TypeScript compilation errors. This issue occurs when multiple packages use different patch versions of zod (e.g., 3.23.x vs 3.24.x), leading to type instantiation depth problems. By pinning to 3.24.2, we ensure consistent behavior across all packages.

  See: https://github.com/colinhacks/zod/issues/3435

- Updated dependencies [[`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c), [`b164bd0`](https://github.com/VoltAgent/voltagent/commit/b164bd014670452cb162b388f03565db992767af), [`9412cf0`](https://github.com/VoltAgent/voltagent/commit/9412cf0633f20d6b77c87625fc05e9e216936758)]:
  - @voltagent/core@0.1.20

## 0.1.6

### Patch Changes

- [#110](https://github.com/VoltAgent/voltagent/pull/110) [`6180880`](https://github.com/VoltAgent/voltagent/commit/6180880a91ea0bb380dd0595e3c3ed6e5c15bc8e) Thanks [@VenomHare](https://github.com/VenomHare)! - ### Features

  - Added multi-modal support for message handling.

  ### Improvements

  - Improved logic for generating system prompts.
  - Implemented enhanced error handling within the provider.

  ### Refactoring

  - Moved utility functions to `utils` folder for better code organization.

  ### Documentation

  - Updated and refined documentation for clarity.

  ### Testing

  - Added tests for newly implemented logic.

## 0.1.4

### Patch Changes

- Updated dependencies [[`b31c8f2`](https://github.com/VoltAgent/voltagent/commit/b31c8f2ad1b4bf242b197a094300cb3397109a94)]:
  - @voltagent/core@0.1.17

## 0.1.2

### Patch Changes

- Updated dependencies [[`cdfec65`](https://github.com/VoltAgent/voltagent/commit/cdfec657f731fdc1b6d0c307376e3299813f55d3)]:
  - @voltagent/core@0.1.14

## 0.1.1

### Patch Changes

- [#58](https://github.com/VoltAgent/voltagent/pull/58) [`cc031e9`](https://github.com/VoltAgent/voltagent/commit/cc031e99b9d35d28c92cb05f5f698b5969250718) Thanks [@VenomHare](https://github.com/VenomHare)! - feat(anthropic-ai): Implemented AnthropicProvider class

  It Allows user to use Anthropic (Claude) models inside Voltagent

  MCP tools are also supported in this provider

  Basic Implementation is described in Examples/with-anthropic

  Resolves #10
