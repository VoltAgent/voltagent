# @voltagent/cli

## 0.1.9

### Patch Changes

- [`00d70cb`](https://github.com/VoltAgent/voltagent/commit/00d70cbb570e4d748ab37e177e4e5df869d52e03) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: update VoltAgent docs MCP configs

## 0.1.8

### Patch Changes

- [#278](https://github.com/VoltAgent/voltagent/pull/278) [`85d979d`](https://github.com/VoltAgent/voltagent/commit/85d979d5205f23ab6e3a85e68af6c46fa7c0f648) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: introduce VoltAgent MCP Docs Server for IDE integration

  Added comprehensive MCP (Model Context Protocol) Docs Server integration to enable AI assistants in IDEs to access VoltAgent documentation directly. This feature allows developers to ask their AI assistants questions about VoltAgent directly within their development environment.

  **New Features:**

  - **`@voltagent/docs-mcp`** package: MCP server that provides access to VoltAgent documentation
  - **CLI MCP commands**: Setup, test, status, and remove MCP configurations
    - `volt mcp setup` - Interactive setup for Cursor, Windsurf, or VS Code
    - `volt mcp test` - Test MCP connection and provide usage examples
    - `volt mcp status` - Show current MCP configuration status
    - `volt mcp remove` - Remove MCP configuration
  - **IDE Configuration**: Automatic configuration file generation for supported IDEs
  - **Multi-IDE Support**: Works with Cursor, Windsurf, and VS Code

  **Usage:**

  ```bash
  # Setup MCP for your IDE
  volt mcp setup

  # Test the connection
  volt mcp test

  # Check status
  volt mcp status
  ```

  Once configured, developers can ask their AI assistant questions like:

  - "How do I create an agent in VoltAgent?"
  - "Is there a VoltAgent example with Next.js?"
  - "How do I use voice features?"
  - "What are the latest updates?"

  The MCP server provides real-time access to VoltAgent documentation, examples, and best practices directly within the IDE environment.

## 0.1.7

### Patch Changes

- [#213](https://github.com/VoltAgent/voltagent/pull/213) [`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f) Thanks [@baseballyama](https://github.com/baseballyama)! - chore!: drop Node.js v18

## 0.1.6

### Patch Changes

- [#155](https://github.com/VoltAgent/voltagent/pull/155) [`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c) Thanks [@baseballyama](https://github.com/baseballyama)! - chore: update `tsconfig.json`'s `target` to `ES2022`

## 0.1.5

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

## 0.1.4

### Patch Changes

- [#73](https://github.com/VoltAgent/voltagent/pull/73) [`ac6ecbc`](https://github.com/VoltAgent/voltagent/commit/ac6ecbc235a10a947a9f60155b04335761e6ac38) Thanks [@necatiozmen](https://github.com/necatiozmen)! - feat: Add placeholder `add` command

  Introduces the `add <agent-slug>` command. Currently, this command informs users that the feature for adding agents from the marketplace is upcoming and provides a link to the GitHub discussions for early feedback and participation.

## 0.1.3

### Patch Changes

- [#33](https://github.com/VoltAgent/voltagent/pull/33) [`3ef2eaa`](https://github.com/VoltAgent/voltagent/commit/3ef2eaa9661e8ecfebf17af56b09af41285d0ca9) Thanks [@kwaa](https://github.com/kwaa)! - Update package.json files:

  - Remove `src` directory from the `files` array.
  - Add explicit `exports` field for better module resolution.

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
