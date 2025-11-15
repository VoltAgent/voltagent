---
"@voltagent/core": patch
"@voltagent/sdk": patch
---

Add full Discord action coverage to `VoltOpsActionsClient`, including typed helpers for messaging, reactions, channels, and guild roles. **All VoltOps Actions now require the inline `credential` payload**—pass `{ id: "cred_xyz" }` to reuse a saved credential or provide provider-specific secrets on the fly. Each provider now has explicit credential typing (Airtable ⇒ `{ apiKey }`, Slack ⇒ `{ botToken }`, Discord ⇒ `{ botToken } | { webhookUrl }`), so editors autocomplete only the valid fields. The SDK propagates these types so apps can invoke VoltOps Actions without managing separate credential IDs.
