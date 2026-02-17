---
"@voltagent/ag-ui": patch
---

fix: preserve assistant feedback metadata across AG-UI streams

- Map VoltAgent `message-metadata` stream chunks to AG-UI `CUSTOM` events, which are the protocol-native channel for application-specific metadata.
- Stop emitting legacy internal tool-result metadata markers from the adapter.
- Continue filtering legacy metadata marker tool messages from model input for compatibility with existing sessions.
