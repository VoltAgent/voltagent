---
"create-voltagent-app": patch
"@voltagent/vercel-ai": patch
"@voltagent/supabase": patch
"@voltagent/voice": patch
"@voltagent/core": patch
"@voltagent/xsai": patch
"@voltagent/cli": patch
---

Update package.json files:

- Remove `src` directory from the `files` array.
- Add explicit `exports` field for better module resolution.
