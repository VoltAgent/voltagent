# @voltagent/xsai

## 0.3.0

### Minor Changes

- [#411](https://github.com/VoltAgent/voltagent/pull/411) [`80b24e2`](https://github.com/VoltAgent/voltagent/commit/80b24e245daa9584733762c9aaf7e23e1d90c6c5) Thanks [@kwaa](https://github.com/kwaa)! - chore(deps): bump xsai to 0.3.3

### Patch Changes

- Updated dependencies [[`99fe836`](https://github.com/VoltAgent/voltagent/commit/99fe83662e9b3e550380fce066521a5c27d69eb3)]:
  - @voltagent/core@0.1.71

## 0.2.4

### Patch Changes

- [#348](https://github.com/VoltAgent/voltagent/pull/348) [`9581df0`](https://github.com/VoltAgent/voltagent/commit/9581df02bce2ba8b25f9f2964b781095bc50b004) Thanks [@Adherentman](https://github.com/Adherentman)! - fix: xsai empty tools will sent undefined - #337

- Updated dependencies [[`b7dcded`](https://github.com/VoltAgent/voltagent/commit/b7dcdedfbbdda5bfb1885317b59b4d4e2495c956), [`822739c`](https://github.com/VoltAgent/voltagent/commit/822739c901bbc679cd11dd2c9df99cd041fc40c7)]:
  - @voltagent/core@0.1.55

## 0.2.3

### Patch Changes

- [#229](https://github.com/VoltAgent/voltagent/pull/229) [`0eba8a2`](https://github.com/VoltAgent/voltagent/commit/0eba8a265c35241da74324613e15801402f7b778) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix: migrate the provider streams to `AsyncIterableStream`

  Example:

  ```typescript
  const stream = createAsyncIterableStream(
    new ReadableStream({
      start(controller) {
        controller.enqueue("Hello");
        controller.enqueue(", ");
        controller.enqueue("world!");
        controller.close();
      },
    })
  );

  for await (const chunk of stream) {
    console.log(chunk);
  }

  // in the agent
  const result = await agent.streamObject({
    messages,
    model: "test-model",
    schema,
  });

  for await (const chunk of result.objectStream) {
    console.log(chunk);
  }
  ```

  New exports:

  - `createAsyncIterableStream`
  - `type AsyncIterableStream`

- Updated dependencies [[`f2f4539`](https://github.com/VoltAgent/voltagent/commit/f2f4539af7722f25a5aad9f01c2b7b5e50ba51b8), [`0eba8a2`](https://github.com/VoltAgent/voltagent/commit/0eba8a265c35241da74324613e15801402f7b778)]:
  - @voltagent/core@0.1.32

## 0.2.2

### Patch Changes

- [#226](https://github.com/VoltAgent/voltagent/pull/226) [`d879e6d`](https://github.com/VoltAgent/voltagent/commit/d879e6d41757081420162cf983223683b72b66a5) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix: add toolName to tool-result steps

  Tool result steps now include the toolName field, ensuring proper identification of which tool generated each result in conversation flows and hook messages.

## 0.2.1

### Patch Changes

- [#213](https://github.com/VoltAgent/voltagent/pull/213) [`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f) Thanks [@baseballyama](https://github.com/baseballyama)! - chore!: drop Node.js v18

- Updated dependencies [[`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f), [`80fd3c0`](https://github.com/VoltAgent/voltagent/commit/80fd3c069de4c23116540a55082b891c4b376ce6)]:
  - @voltagent/core@0.1.31

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

## 0.1.9

### Patch Changes

- [#155](https://github.com/VoltAgent/voltagent/pull/155) [`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c) Thanks [@baseballyama](https://github.com/baseballyama)! - chore: update `tsconfig.json`'s `target` to `ES2022`

- [#162](https://github.com/VoltAgent/voltagent/pull/162) [`b164bd0`](https://github.com/VoltAgent/voltagent/commit/b164bd014670452cb162b388f03565db992767af) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: pin zod version to 3.24.2 to avoid "Type instantiation is excessively deep and possibly infinite" error

  Fixed compatibility issues between different zod versions that were causing TypeScript compilation errors. This issue occurs when multiple packages use different patch versions of zod (e.g., 3.23.x vs 3.24.x), leading to type instantiation depth problems. By pinning to 3.24.2, we ensure consistent behavior across all packages.

  See: https://github.com/colinhacks/zod/issues/3435

- Updated dependencies [[`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c), [`b164bd0`](https://github.com/VoltAgent/voltagent/commit/b164bd014670452cb162b388f03565db992767af), [`9412cf0`](https://github.com/VoltAgent/voltagent/commit/9412cf0633f20d6b77c87625fc05e9e216936758)]:
  - @voltagent/core@0.1.20

## 0.1.8

### Patch Changes

- [#100](https://github.com/VoltAgent/voltagent/pull/100) [`0bdcf94`](https://github.com/VoltAgent/voltagent/commit/0bdcf9441cc79cf6321b377c303123d28daddda4) Thanks [@kwaa](https://github.com/kwaa)! - feat: Add multi-modal support (see [docs](https://voltagent.dev/docs/providers/xsai/#multi-modal-support)) - [#79](https://github.com/VoltAgent/voltagent/issues/79)

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
  - @voltagent/xsai@0.1.6

## 0.1.5

### Patch Changes

- [`13db262`](https://github.com/VoltAgent/voltagent/commit/13db2621ae6b730667f9991d3c2129c85265e925) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: Update Zod to version 3.24.2 to resolve "Type instantiation is excessively deep and possibly infinite" error (related to https://github.com/colinhacks/zod/issues/3435).

- Updated dependencies [[`f7de864`](https://github.com/VoltAgent/voltagent/commit/f7de864503d598cf7131cc01afa3779639190107), [`13db262`](https://github.com/VoltAgent/voltagent/commit/13db2621ae6b730667f9991d3c2129c85265e925)]:
  - @voltagent/core@0.1.13
  - @voltagent/xsai@0.1.5

## 0.1.4

### Patch Changes

- [#77](https://github.com/VoltAgent/voltagent/pull/77) [`beaa8fb`](https://github.com/VoltAgent/voltagent/commit/beaa8fb1f1bc6351f1bede0b65a6a189cc1b6ea2) Thanks [@omeraplak](https://github.com/omeraplak)! - **API & Providers:** Standardized message content format for array inputs.

  - The API (`/text`, `/stream`, `/object`, `/stream-object` endpoints) now strictly expects the `content` field within message objects (when `input` is an array) to be either a `string` or an `Array` of content parts (e.g., `[{ type: 'text', text: '...' }]`).
  - The previous behavior of allowing a single content object (e.g., `{ type: 'text', ... }`) directly as the value for `content` in message arrays is no longer supported in the API schema. Raw string inputs remain unchanged.
  - Provider logic (`google-ai`, `groq-ai`, `xsai`) updated to align with this stricter definition.

  **Console:**

  - **Added file and image upload functionality to the Assistant Chat.** Users can now attach multiple files/images via a button, preview attachments, and send them along with text messages.
  - Improved the Assistant Chat resizing: Replaced size toggle buttons with a draggable handle (top-left corner).
  - Chat window dimensions are now saved to local storage and restored on reload.

  **Internal:**

  - Added comprehensive test suites for Groq and XsAI providers.

- Updated dependencies [[`beaa8fb`](https://github.com/VoltAgent/voltagent/commit/beaa8fb1f1bc6351f1bede0b65a6a189cc1b6ea2)]:
  - @voltagent/core@0.1.10
  - @voltagent/xsai@0.1.4

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
