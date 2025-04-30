---
"@voltagent/vercel-ai": patch
"@voltagent/supabase": patch
"@voltagent/groq-ai": patch
"@voltagent/core": patch
---

feat: Standardize Agent Error and Finish Handling

This change introduces a more robust and consistent way errors and successful finishes are handled across the `@voltagent/core` Agent and LLM provider implementations (like `@voltagent/vercel-ai`).

**Key Improvements:**

- **Standardized Errors (`VoltagentError`):**

  - Introduced `VoltagentError`, `ToolErrorInfo`, and `StreamOnErrorCallback` types in `@voltagent/core`.
  - LLM Providers (e.g., Vercel) now wrap underlying SDK/API errors into a structured `VoltagentError` before passing them to `onError` callbacks or throwing them.
  - Agent methods (`generateText`, `streamText`, `generateObject`, `streamObject`) now consistently handle `VoltagentError`, enabling richer context (stage, code, tool details) in history events and logs.

- **Standardized Stream Finish Results:**

  - Introduced `StreamTextFinishResult`, `StreamTextOnFinishCallback`, `StreamObjectFinishResult`, and `StreamObjectOnFinishCallback` types in `@voltagent/core`.
  - LLM Providers (e.g., Vercel) now construct these standardized result objects upon successful stream completion.
  - Agent streaming methods (`streamText`, `streamObject`) now receive these standardized results in their `onFinish` handlers, ensuring consistent access to final output (`text` or `object`), `usage`, `finishReason`, etc., for history, events, and hooks.

- **Updated Interfaces:** The `LLMProvider` interface and related options types (`StreamTextOptions`, `StreamObjectOptions`) have been updated to reflect these new standardized callback types and error-throwing expectations.

These changes lead to more predictable behavior, improved debugging capabilities through structured errors, and a more consistent experience when working with different LLM providers.
