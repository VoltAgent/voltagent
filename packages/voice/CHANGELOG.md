# @voltagent/voice

## 0.2.0

### Minor Changes

- [#195](https://github.com/VoltAgent/voltagent/pull/195) [`0c4e941`](https://github.com/VoltAgent/voltagent/commit/0c4e9418ae75c82b20a503678e75277729c0174b) Thanks [@Ajay-Satish-01](https://github.com/Ajay-Satish-01)! - 🚨 Breaking Change: Renamed XsAI and Xsai to XSAI

  We’ve renamed the XsAI and Xsai classes to XSAI to keep naming consistent across the framework.

  What changed?

  If you’re using the XsAIProvider or XsAIVoiceProvider, you now need to update your code to use XSAIProvider and XSAIVoiceProvider.

  Before:

  ```ts
  import { XsAIVoiceProvider } from "@voltagent/voice";

  const agent = new Agent({
    name: "Asistant",
    description: "A helpful assistant that answers questions without using tools",
    llm: new XsAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
    }),
    model: "gpt-4o-mini",
  });

  const voiceProvider = new XsAIVoiceProvider({
    apiKey: process.env.OPENAI_API_KEY!,
  });
  ```

  After:

  ```ts
  import { XSAIVoiceProvider } from "@voltagent/voice";

  const agent = new Agent({
    name: "Asistant",
    description: "A helpful assistant that answers questions without using tools",
    llm: new XSAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
    }),
    model: "gpt-4o-mini",
  });

  const voiceProvider = new XSAIVoiceProvider({
    apiKey: process.env.OPENAI_API_KEY!,
  });
  ```

  This change resolves [#140](https://github.com/your-repo/issues/140).

### Patch Changes

- Updated dependencies [[`07d99d1`](https://github.com/VoltAgent/voltagent/commit/07d99d133232babf78ba4e1c32fe235d5b3c9944), [`67b0e7e`](https://github.com/VoltAgent/voltagent/commit/67b0e7ea704d23bf9efb722c0b0b4971d0974153)]:
  - @voltagent/core@0.1.29

## 0.1.7

### Patch Changes

- [#155](https://github.com/VoltAgent/voltagent/pull/155) [`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c) Thanks [@baseballyama](https://github.com/baseballyama)! - chore: update `tsconfig.json`'s `target` to `ES2022`

- Updated dependencies [[`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c), [`b164bd0`](https://github.com/VoltAgent/voltagent/commit/b164bd014670452cb162b388f03565db992767af), [`9412cf0`](https://github.com/VoltAgent/voltagent/commit/9412cf0633f20d6b77c87625fc05e9e216936758)]:
  - @voltagent/core@0.1.20

## 0.1.6

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

- Updated dependencies [[`cdfec65`](https://github.com/VoltAgent/voltagent/commit/cdfec657f731fdc1b6d0c307376e3299813f55d3)]:
  - @voltagent/core@0.1.14

## 0.1.5

### Patch Changes

- [#98](https://github.com/VoltAgent/voltagent/pull/98) [`c3db06d`](https://github.com/VoltAgent/voltagent/commit/c3db06d722ea27585c37be126ae49b0361729747) Thanks [@yusuf-eren](https://github.com/yusuf-eren)! - feat(xsAI): add xsAI voice provider

  This adds support for the xsAI voice provider, including:

  - Core provider implementation support
  - Support for API key authentication and custom headers
  - Base URL configuration for API endpoints

- Updated dependencies [[`f7de864`](https://github.com/VoltAgent/voltagent/commit/f7de864503d598cf7131cc01afa3779639190107), [`13db262`](https://github.com/VoltAgent/voltagent/commit/13db2621ae6b730667f9991d3c2129c85265e925)]:
  - @voltagent/core@0.1.13

## 0.1.4

### Patch Changes

- [#67](https://github.com/VoltAgent/voltagent/pull/67) [`ba4b44d`](https://github.com/VoltAgent/voltagent/commit/ba4b44d61262d795f2afb7951be259bd4b4bec40) Thanks [@luixaviles](https://github.com/luixaviles)! - fix(voice): Fix stream handling in ElevenLabs provider

  Fixes #62

- Updated dependencies [[`55c58b0`](https://github.com/VoltAgent/voltagent/commit/55c58b0da12dd94a3095aad4bc74c90757c98db4), [`d40cb14`](https://github.com/VoltAgent/voltagent/commit/d40cb14860a5abe8771e0b91200d10f522c62881), [`e88cb12`](https://github.com/VoltAgent/voltagent/commit/e88cb1249c4189ced9e245069bed5eab71cdd894), [`0651d35`](https://github.com/VoltAgent/voltagent/commit/0651d35442cda32b6057f8b7daf7fd8655a9a2a4)]:
  - @voltagent/core@0.1.8

## 0.1.3

### Patch Changes

- [#33](https://github.com/VoltAgent/voltagent/pull/33) [`3ef2eaa`](https://github.com/VoltAgent/voltagent/commit/3ef2eaa9661e8ecfebf17af56b09af41285d0ca9) Thanks [@kwaa](https://github.com/kwaa)! - Update package.json files:

  - Remove `src` directory from the `files` array.
  - Add explicit `exports` field for better module resolution.

- Updated dependencies [[`52d5fa9`](https://github.com/VoltAgent/voltagent/commit/52d5fa94045481dc43dc260a40b701606190585c), [`3ef2eaa`](https://github.com/VoltAgent/voltagent/commit/3ef2eaa9661e8ecfebf17af56b09af41285d0ca9), [`52d5fa9`](https://github.com/VoltAgent/voltagent/commit/52d5fa94045481dc43dc260a40b701606190585c)]:
  - @voltagent/core@0.1.6

## 0.1.1

- 🚀 **Introducing VoltAgent: TypeScript AI Agent Framework!**

  This initial release marks the beginning of VoltAgent, a powerful toolkit crafted for the JavaScript developer community. We saw the challenges: the complexity of building AI from scratch, the limitations of No-Code tools, and the lack of first-class AI tooling specifically for JS.

  ![VoltAgent Demo](https://cdn.voltagent.dev/readme/demo.gif)
  VoltAgent aims to fix that by providing the building blocks you need:

  - **`@voltagent/core`**: The foundational engine for agent capabilities.
  - **`@voltagent/voice`**: Easily add voice interaction.
  - **`@voltagent/vercel-ai`**: Seamless integration with [Vercel AI SDK](https://sdk.vercel.ai/docs/introduction).
  - **`@voltagent/xsai`**: A Seamless integration with [xsAI](https://xsai.js.org/).
  - **`@voltagent/cli` & `create-voltagent-app`**: Quick start tools to get you building _fast_.

  We're combining the flexibility of code with the clarity of visual tools (like our **currently live [VoltOps LLM Observability Platform](https://console.voltagent.dev/)**) to make AI development easier, clearer, and more powerful. Join us as we build the future of AI in JavaScript!

  Explore the [Docs](https://voltagent.dev/docs/) and join our [Discord community](https://s.voltagent.dev/discord)!
