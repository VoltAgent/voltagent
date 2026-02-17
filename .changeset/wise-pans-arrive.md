---
"@voltagent/ag-ui": patch
---

fix: preserve assistant feedback metadata across AG-UI streams

- Map VoltAgent `message-metadata` stream chunks to AG-UI `CUSTOM` events, which are the protocol-native channel for application-specific metadata.
- Keep emitting a legacy internal tool-result marker for backward compatibility with existing clients.
- Prevent internal metadata marker tool messages from being sent back to the model on subsequent turns.
