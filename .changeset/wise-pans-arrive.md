---
"@voltagent/ag-ui": patch
---

fix: preserve assistant feedback metadata across AG-UI streams

- Map VoltAgent `message-metadata` stream chunks into AG-UI-compatible events so feedback metadata reaches chat clients.
- Carry metadata through a dedicated internal tool-result marker that can be correlated to the assistant message id.
- Prevent those internal metadata marker messages from being sent back to the model on subsequent turns.
