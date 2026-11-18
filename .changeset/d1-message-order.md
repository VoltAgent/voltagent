---
"@voltagent/cloudflare-d1": patch
---

fix(cloudflare-d1): keep insertion order for messages that share a timestamp

`addMessages` stores one `created_at` for the whole batch, and `getMessages` ordered by `created_at` alone. With `limit`, the newest messages of the last batch could be dropped in favour of older ones from the same batch. Ties are now broken by insertion order (`rowid`).
