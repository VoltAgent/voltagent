🚀 **Introducing VoltAgent: TypeScript AI Agent Framework!**

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

# Changelog

## 0.1.9

### Patch Changes

- [#71](https://github.com/VoltAgent/voltagent/pull/71) [`1f20509`](https://github.com/VoltAgent/voltagent/commit/1f20509528fc2cb2ba00f86d649848afae34af04) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Introduce `userContext` for passing custom data through agent operations (`@voltagent/core`).
- [#71](https://github.com/VoltAgent/voltagent/pull/71) [`1f20509`](https://github.com/VoltAgent/voltagent/commit/1f20509528fc2cb2ba00f86d649848afae34af04) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Standardize Agent Error and Finish Handling (`@voltagent/core`).
- [`7a7a0f6`](https://github.com/VoltAgent/voltagent/commit/7a7a0f672adbe42635c3edc5f0a7f282575d0932) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Refactor Agent Hooks Signature to Use Single Argument Object - #57 (`@voltagent/core`).

- Updated dependencies:
  - `@voltagent/core@0.1.9`

## 0.1.8

### Minor Changes

- [#52](https://github.com/VoltAgent/voltagent/pull/52) [`96f2395`](https://github.com/VoltAgent/voltagent/commit/96f239548a207d8cf34694999129980a7998f6e1) Thanks [@foxy17](https://github.com/foxy17)! - feat(`@voltagent/google-ai`): Add `generateObject` method and `GEMINI_API_KEY` env var support.
- [`e88cb12`](https://github.com/VoltAgent/voltagent/commit/e88cb1249c4189ced9e245069bed5eab71cdd894) Thanks [@omeraplak](https://github.com/omeraplak)! - feat(`@voltagent/core`): Enhance `createPrompt` with Template Literal Type Inference.
- [#65](https://github.com/VoltAgent/voltagent/pull/65) [`0651d35`](https://github.com/VoltAgent/voltagent/commit/0651d35442cda32b6057f8b7daf7fd8655a9a2a4) Thanks [@omeraplak](https://github.com/omeraplak)! - feat(`@voltagent/core`): Add OpenAPI (Swagger) Documentation for Core API - #64.

### Patch Changes

- [#51](https://github.com/VoltAgent/voltagent/pull/51) [`55c58b0`](https://github.com/VoltAgent/voltagent/commit/55c58b0da12dd94a3095aad4bc74c90757c98db4) Thanks [@kwaa](https://github.com/kwaa)! - fix(`@voltagent/core`): Use the latest Hono to avoid duplicate dependencies.
- [#59](https://github.com/VoltAgent/voltagent/pull/59) [`d40cb14`](https://github.com/VoltAgent/voltagent/commit/d40cb14860a5abe8771e0b91200d10f522c62881) Thanks [@kwaa](https://github.com/kwaa)! - fix(`@voltagent/core`): Add package exports.
- [#40](https://github.com/VoltAgent/voltagent/pull/40) [`37c2136`](https://github.com/VoltAgent/voltagent/commit/37c21367da7dd639c0854a14a933f7904dca3908) Thanks [@TheEmi](https://github.com/TheEmi)! - feat(`@voltagent/groq-ai`): Initial implementation using groq-sdk - #13.
- [#67](https://github.com/VoltAgent/voltagent/pull/67) [`ba4b44d`](https://github.com/VoltAgent/voltagent/commit/ba4b44d61262d795f2afb7951be259bd4b4bec40) Thanks [@luixaviles](https://github.com/luixaviles)! - fix(`@voltagent/voice`): Fix stream handling in ElevenLabs provider - #62.

- Updated dependencies:
  - `@voltagent/groq-ai@0.1.1` -> `@voltagent/core@0.1.8`
  - `@voltagent/google-ai@0.3.0` -> `@voltagent/core@0.1.8`
  - `@voltagent/voice@0.1.4` -> `@voltagent/core@0.1.8`
  - `@voltagent/xsai` -> `@voltagent/core@0.1.6`

## 0.1.7

### Minor Changes

- [#29](https://github.com/VoltAgent/voltagent/pull/29) [`82e27c2`](https://github.com/VoltAgent/voltagent/commit/82e27c2bcd19fbf476d7812b91df3ab399a03357) Thanks [@foxy17](https://github.com/foxy17)! - feat(google-ai): Add initial Google AI provider package (`@voltagent/google-ai`) - #12

### Patch Changes

- [#41](https://github.com/VoltAgent/voltagent/pull/41) [`52d5fa9`](https://github.com/VoltAgent/voltagent/commit/52d5fa94045481dc43dc260a40b701606190585c) Thanks [@omeraplak](https://github.com/omeraplak)! - Introducing Toolkits and Reasoning Tools Helper for `@voltagent/core`.

- [#35](https://github.com/VoltAgent/voltagent/pull/35) [`9acbbb8`](https://github.com/VoltAgent/voltagent/commit/9acbbb898a517902cbdcb7ae7a8460e9d35f3dbe) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: Prevent potential error when accessing debug option in LibSQLStorage (`@voltagent/core`) - #34

- [#27](https://github.com/VoltAgent/voltagent/pull/27) [`3c0829d`](https://github.com/VoltAgent/voltagent/commit/3c0829dcec4db9596147b583a9cf2d4448bc30f1) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: improve sub-agent context sharing for sequential task execution (`@voltagent/core`) - #30

- [#33](https://github.com/VoltAgent/voltagent/pull/33) [`3ef2eaa`](https://github.com/VoltAgent/voltagent/commit/3ef2eaa9661e8ecfebf17af56b09af41285d0ca9) Thanks [@kwaa](https://github.com/kwaa)! - Update package.json files (removed `src` from `files`, added `exports`) for `@voltagent/cli`, `@voltagent/core`, `create-voltagent-app`, `@voltagent/google-ai`, `@voltagent/supabase`, `@voltagent/vercel-ai`, `@voltagent/voice`, `@voltagent/xsai`.

- [#21](https://github.com/VoltAgent/voltagent/pull/21) [`8c3506e`](https://github.com/VoltAgent/voltagent/commit/8c3506e27486ac371192ef9ffb6a997e8e1692e9) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Introduce Supabase Memory Provider (`@voltagent/supabase`) - #8

- Updated dependencies:
  - `@voltagent/google-ai` -> `@voltagent/core@0.1.6`
  - `@voltagent/supabase` -> `@voltagent/core@0.1.6`
  - `@voltagent/vercel-ai` -> `@voltagent/core@0.1.6`
  - `@voltagent/voice` -> `@voltagent/core@0.1.6`
  - `@voltagent/xsai` -> `@voltagent/core@0.1.6`

## 0.1.0 (Initial Release)
