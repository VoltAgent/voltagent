---
"@voltagent/cloudflare-d1": patch
---

fix(cloudflare-d1): `deleteMessages` works for more than 98 ids

D1 rejects a statement with more than 100 bound parameters, and `deleteMessages` bound every id plus the conversation and user ids in one statement, so deleting 99 or more messages failed with `too many SQL variables`. The ids are now split into statements under the limit and run in one batch.
