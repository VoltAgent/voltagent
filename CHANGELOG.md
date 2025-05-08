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

## 0.1.14

### Patch Changes

- [#102](https://github.com/VoltAgent/voltagent/pull/102) [`cdfec65`](https://github.com/VoltAgent/voltagent/commit/cdfec657f731fdc1b6d0c307376e3299813f55d3) Thanks [@omeraplak](https://github.com/omeraplak)! - refactor: use 'instructions' field for Agent definitions in examples - #88 (`@voltagent/core`, `@voltagent/xsai`, `@voltagent/voice`, `@voltagent/vercel-ai`, `@voltagent/supabase`, `@voltagent/langfuse-exporter`, `@voltagent/groq-ai`, `@voltagent/google-ai`, `create-voltagent-app`, `@voltagent/cli`).

- Updated dependencies:
  - @voltagent/core@0.1.14
  - @voltagent/xsai@0.1.6
  - @voltagent/voice@0.1.6
  - @voltagent/vercel-ai@0.1.7
  - @voltagent/supabase@0.1.4
  - @voltagent/langfuse-exporter@0.1.2
  - @voltagent/groq-ai@0.1.5
  - @voltagent/google-ai@0.3.4
  - @voltagent/anthropic-ai@0.1.2

## 0.1.13

### Patch Changes

- [`f7de864`](https://github.com/VoltAgent/voltagent/commit/f7de864503d598cf7131cc01afa3779639190107) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: add `toolName` to event metadata to ensure `delegate_task` name is visible in Voltagent console (`@voltagent/core`).
- [`13db262`](https://github.com/VoltAgent/voltagent/commit/13db2621ae6b730667f9991d3c2129c85265e925) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: Update Zod to version 3.24.2 to resolve "Type instantiation is excessively deep and possibly infinite" error (related to https://github.com/colinhacks/zod/issues/3435) (`@voltagent/core`, `@voltagent/xsai`, `@voltagent/vercel-ai`, `@voltagent/groq-ai`, `@voltagent/google-ai`, `create-voltagent-app`).

- Updated dependencies:
  - @voltagent/core@0.1.13
  - @voltagent/xsai@0.1.5
  - @voltagent/voice@0.1.5
  - @voltagent/vercel-ai@0.1.6
  - @voltagent/groq-ai@0.1.4
  - @voltagent/google-ai@0.3.3

## 0.1.12

### Patch Changes

- [#94](https://github.com/VoltAgent/voltagent/pull/94) [`004df81`](https://github.com/VoltAgent/voltagent/commit/004df81fa6a23571391e6ddeba0dfe6bfea267e8) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Add Langfuse Observability Exporter (`@voltagent/core`, `@voltagent/langfuse-exporter`).

- Updated dependencies:
  - @voltagent/core@0.1.12
  - @voltagent/langfuse-exporter@0.1.1

## 0.1.11

### Patch Changes

- [`e5b3a46`](https://github.com/VoltAgent/voltagent/commit/e5b3a46e2e61f366fa3c67f9a37d4e4d9e0fe426) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: enhance API Overview documentation (`@voltagent/core`).
- [`4649c3c`](https://github.com/VoltAgent/voltagent/commit/4649c3ccb9e56a7fcabfe6a0bcef2383ff6506ef) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: improve agent event handling and error processing (`@voltagent/core`).
- [`8e6d2e9`](https://github.com/VoltAgent/voltagent/commit/8e6d2e994398c1a727d4afea39d5e34ffc4a5fca) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Allow passing arbitrary provider-specific options via the `provider` object in agent generation methods (`@voltagent/core`, `create-voltagent-app`).
- [`340feee`](https://github.com/VoltAgent/voltagent/commit/340feee1162e74c52def337af8f35d8d3117eefc) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: Add index signature `[key: string]: any;` to `GoogleProviderRuntimeOptions` (`@voltagent/google-ai`).

- Updated dependencies:
  - @voltagent/core@0.1.11
  - @voltagent/google-ai@0.3.2

## 0.1.10

### Patch Changes

- [#77](https://github.com/VoltAgent/voltagent/pull/77) [`beaa8fb`](https://github.com/VoltAgent/voltagent/commit/beaa8fb1f1bc6351f1bede0b65a6a189cc1b6ea2) Thanks [@omeraplak](https://github.com/omeraplak)! - API & Providers: Standardized message content format for array inputs. Console: Added file and image upload, improved chat resizing. Internal: Added test suites for Groq and XsAI (`@voltagent/core`, `@voltagent/xsai`, `@voltagent/vercel-ai`, `@voltagent/groq-ai`, `@voltagent/google-ai`).

- Updated dependencies:
  - @voltagent/core@0.1.10
  - @voltagent/xsai@0.1.4
  - @voltagent/vercel-ai@0.1.5
  - @voltagent/groq-ai@0.1.3
  - @voltagent/google-ai@0.3.1

## 0.1.9

### Patch Changes

- [#71](https://github.com/VoltAgent/voltagent/pull/71) [`1f20509`](https://github.com/VoltAgent/voltagent/commit/1f20509528fc2cb2ba00f86d649848afae34af04) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Introduce `userContext` for passing custom data through agent operations (`@voltagent/core`).
- [#71](https://github.com/VoltAgent/voltagent/pull/71) [`1f20509`](https://github.com/VoltAgent/voltagent/commit/1f20509528fc2cb2ba00f86d649848afae34af04) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Standardize Agent Error and Finish Handling (`@voltagent/core`, `@voltagent/vercel-ai`, `@voltagent/supabase`, `@voltagent/groq-ai`).
- [`7a7a0f6`](https://github.com/VoltAgent/voltagent/commit/7a7a0f672adbe42635c3edc5f0a7f282575d0932) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Refactor Agent Hooks Signature to Use Single Argument Object - #57 (`@voltagent/core`).

- Updated dependencies:
  - `@voltagent/core@0.1.9`
  - `@voltagent/vercel-ai@0.1.4`
  - `@voltagent/supabase@0.1.3`
  - `@voltagent/groq-ai@0.1.2`

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
- [#98](https://github.com/VoltAgent/voltagent/pull/98) [`c3db06d`](https://github.com/VoltAgent/voltagent/commit/c3db06d722ea27585c37be126ae49b0361729747) Thanks [@yusuf-eren](https://github.com/yusuf-eren)! - feat(xsAI): add xsAI voice provider (`@voltagent/voice`).
- [#83](https://github.com/VoltAgent/voltagent/pull/83) [`5edf79d`](https://github.com/VoltAgent/voltagent/commit/5edf79d73b7f114c2e894cc532ce7fc8b3354a10) Thanks [@TheEmi](https://github.com/TheEmi)! - Added tool handling by manually calling the desired functions for generateText and streamText, fixed some type issues, added streamObject support (`@voltagent/groq-ai`).
- [#99](https://github.com/VoltAgent/voltagent/pull/99) [`82c1066`](https://github.com/VoltAgent/voltagent/commit/82c1066462456aa71bb9427cfd46d061235088d5) Thanks [@luixaviles](https://github.com/luixaviles)! - feat(google-ai): add function calling support for Google SDK integration (`@voltagent/google-ai`).
- [#73](https://github.com/VoltAgent/voltagent/pull/73) [`ac6ecbc`](https://github.com/VoltAgent/voltagent/commit/ac6ecbc235a10a947a9f60155b04335761e6ac38) Thanks [@necatiozmen](https://github.com/necatiozmen)! - feat: Add placeholder `add` command (`@voltagent/cli`).
- [#58](https://github.com/VoltAgent/voltagent/pull/58) [`cc031e9`](https://github.com/VoltAgent/voltagent/commit/cc031e99b9d35d28c92cb05f5f698b5969250718) Thanks [@VenomHare](https://github.com/VenomHare)! - feat(anthropic-ai): Implemented AnthropicProvider class (`@voltagent/anthropic-ai`).

- Updated dependencies:
  - `@voltagent/groq-ai@0.1.1` -> `@voltagent/core@0.1.8`
  - `@voltagent/google-ai@0.3.0` -> `@voltagent/core@0.1.8`
  - `@voltagent/voice@0.1.4` -> `@voltagent/core@0.1.8`
  - `@voltagent/xsai@0.1.3` -> `@voltagent/core@0.1.6` (Note: This was 0.1.6 in original, xsai's 0.1.3 depends on core 0.1.6)
  - `@voltagent/anthropic-ai@0.1.1`

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
  - `@voltagent/google-ai@0.2.0` -> `@voltagent/core@0.1.6`
  - `@voltagent/supabase@0.1.2` -> `@voltagent/core@0.1.6`
  - `@voltagent/vercel-ai@0.1.3` -> `@voltagent/core@0.1.6`
  - `@voltagent/voice@0.1.3` -> `@voltagent/core@0.1.6`
  - `@voltagent/xsai@0.1.3` -> `@voltagent/core@0.1.6`
  - `@voltagent/cli@0.1.3`
  - `create-voltagent-app@0.1.11`

## 0.1.0 (Initial Release)
