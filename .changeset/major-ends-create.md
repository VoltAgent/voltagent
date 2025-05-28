---
"create-voltagent-app": patch
"@voltagent/anthropic-ai": patch
"@voltagent/google-ai": patch
"@voltagent/vercel-ai": patch
"@voltagent/groq-ai": patch
"@voltagent/core": patch
"@voltagent/xsai": patch
---

fix: pin zod version to 3.24.2 to avoid "Type instantiation is excessively deep and possibly infinite" error

Fixed compatibility issues between different zod versions that were causing TypeScript compilation errors. This issue occurs when multiple packages use different patch versions of zod (e.g., 3.23.x vs 3.24.x), leading to type instantiation depth problems. By pinning to 3.24.2, we ensure consistent behavior across all packages.

See: https://github.com/colinhacks/zod/issues/3435
