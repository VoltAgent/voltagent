# create-voltagent-app

## 0.1.18

### Patch Changes

- [#102](https://github.com/VoltAgent/voltagent/pull/102) [`cdfec65`](https://github.com/VoltAgent/voltagent/commit/cdfec657f731fdc1b6d0c307376e3299813f55d3) Thanks [@omeraplak](https://github.com/omeraplak)! - refactor: use 'instructions' field for Agent definitions in examples - #88

  Updated documentation examples (READMEs, docs, blogs) and relevant package code examples to use the `instructions` field instead of `description` when defining `Agent` instances.

  This change aligns the examples with the preferred API usage for the `Agent` class, where `instructions` provides behavioral guidance to the agent/LLM. This prepares for the eventual deprecation of the `description` field specifically for `Agent` class definitions.

  **Example Change for Agent Definition:**

  ```diff
    const agent = new Agent({
      name: "My Assistant",
  -   description: "A helpful assistant.",
  +   instructions: "A helpful assistant.",
      llm: new VercelAIProvider(),
      model: openai("gpt-4o-mini"),
    });
  ```

## 0.1.16

### Patch Changes

- [`13db262`](https://github.com/VoltAgent/voltagent/commit/13db2621ae6b730667f9991d3c2129c85265e925) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: Update Zod to version 3.24.2 to resolve "Type instantiation is excessively deep and possibly infinite" error (related to https://github.com/colinhacks/zod/issues/3435).

## 0.1.14

### Patch Changes

- [`8e6d2e9`](https://github.com/VoltAgent/voltagent/commit/8e6d2e994398c1a727d4afea39d5e34ffc4a5fca) Thanks [@omeraplak](https://github.com/omeraplak)! - chore: add README

## 0.1.11

### Patch Changes

- [#33](https://github.com/VoltAgent/voltagent/pull/33) [`3ef2eaa`](https://github.com/VoltAgent/voltagent/commit/3ef2eaa9661e8ecfebf17af56b09af41285d0ca9) Thanks [@kwaa](https://github.com/kwaa)! - Update package.json files:

  - Remove `src` directory from the `files` array.
  - Add explicit `exports` field for better module resolution.
