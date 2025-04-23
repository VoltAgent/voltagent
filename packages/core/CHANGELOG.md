# @voltagent/core

## 0.1.4

### Patch Changes

- [#27](https://github.com/VoltAgent/voltagent/pull/27) [`3c0829d`](https://github.com/VoltAgent/voltagent/commit/3c0829dcec4db9596147b583a9cf2d4448bc30f1) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: improve sub-agent context sharing for sequential task execution - #30

  Enhanced the Agent system to properly handle context sharing between sub-agents, enabling reliable sequential task execution. The changes include:

  - Adding `contextMessages` parameter to `getSystemMessage` method
  - Refactoring `prepareAgentsMemory` to properly format conversation history
  - Ensuring conversation context is correctly passed between delegated tasks
  - Enhancing system prompts to better handle sequential workflows

  This fixes issues where the second agent in a sequence would not have access to the first agent's output, causing failures in multi-step workflows.

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

  We're combining the flexibility of code with the clarity of visual tools (like our **currently live [VoltAgent Console](https://console.voltagent.dev/)**) to make AI development easier, clearer, and more powerful. Join us as we build the future of AI in JavaScript!

  Explore the [Docs](https://voltagent.dev/docs/) and join our [Discord community](https://s.voltagent.dev/discord)!
