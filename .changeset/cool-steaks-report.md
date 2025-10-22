---
"@voltagent/core": patch
---

Strip providerMetadata from text parts before calling convertToModelMessages to prevent invalid providerOptions in the resulting ModelMessage[].
