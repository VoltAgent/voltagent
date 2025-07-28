---
"@voltagent/anthropic-ai": patch
---

fix(anthropic-ai): improve generateObject JSON formatting with explicit system prompt

Enhanced system prompt to prevent AI from wrapping JSON responses in markdown code blocks, fixing JSON parsing errors in generateObject method.
