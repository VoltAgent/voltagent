---
"@voltagent/server-core": patch
---

fix(auth): require explicit NODE_ENV=development for dev auth bypass

Previously, `isDevRequest()` treated any non-production `NODE_ENV` (including
`undefined`) as a development environment, allowing auth bypass with a simple
header. Deployments that forgot to set `NODE_ENV=production` were fully open.

Now only `NODE_ENV=development` or `NODE_ENV=test` enable the dev bypass
(fail-closed). Undefined/empty `NODE_ENV` is treated as production.
