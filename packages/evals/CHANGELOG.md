# @voltagent/evals

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
