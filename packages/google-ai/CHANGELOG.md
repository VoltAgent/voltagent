# @voltagent/google-ai

## 0.3.0

### Minor Changes

- [#52](https://github.com/VoltAgent/voltagent/pull/52) [`96f2395`](https://github.com/VoltAgent/voltagent/commit/96f239548a207d8cf34694999129980a7998f6e1) Thanks [@foxy17](https://github.com/foxy17)! - feat: Add `generateObject` method for structured JSON output via Zod schemas and Google's JSON mode.
  feat: Add support for reading the Google GenAI API key from the `GEMINI_API_KEY` environment variable as a fallback.

### Patch Changes

- Updated dependencies [[`55c58b0`](https://github.com/VoltAgent/voltagent/commit/55c58b0da12dd94a3095aad4bc74c90757c98db4), [`d40cb14`](https://github.com/VoltAgent/voltagent/commit/d40cb14860a5abe8771e0b91200d10f522c62881), [`e88cb12`](https://github.com/VoltAgent/voltagent/commit/e88cb1249c4189ced9e245069bed5eab71cdd894), [`0651d35`](https://github.com/VoltAgent/voltagent/commit/0651d35442cda32b6057f8b7daf7fd8655a9a2a4)]:
  - @voltagent/core@0.1.8

## 0.2.0

### Minor Changes

- [#29](https://github.com/VoltAgent/voltagent/pull/29) [`82e27c2`](https://github.com/VoltAgent/voltagent/commit/82e27c2bcd19fbf476d7812b91df3ab399a03357) Thanks [@foxy17](https://github.com/foxy17)! - feat(google-ai): Add initial Google AI provider package - #12

  Introduces the `@voltagent/google-ai` package to integrate Google's Generative AI capabilities directly into VoltAgent. This allows developers to leverage powerful models like Gemini within their agents.

  This initial version includes:

  - The core `GoogleGenAIProvider` class for interfacing with the `@google/genai` SDK.
  - Configuration options for API key authentication.
  - Basic setup and usage examples in the README.
  - Documentation outlining future support and considerations for Vertex AI.

### Patch Changes

- Updated dependencies [[`52d5fa9`](https://github.com/VoltAgent/voltagent/commit/52d5fa94045481dc43dc260a40b701606190585c), [`3ef2eaa`](https://github.com/VoltAgent/voltagent/commit/3ef2eaa9661e8ecfebf17af56b09af41285d0ca9), [`52d5fa9`](https://github.com/VoltAgent/voltagent/commit/52d5fa94045481dc43dc260a40b701606190585c)]:
  - @voltagent/core@0.1.6
