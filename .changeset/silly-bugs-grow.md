---
"@voltagent/core": patch
---

feat: enhance API Overview documentation

- Added `curl` examples for all key generation endpoints (`/text`, `/stream`, `/object`, `/stream-object`).
- Clarified that `userId` and `conversationId` options are optional.
- Provided separate `curl` examples demonstrating usage both with and without optional parameters (`userId`, `conversationId`).
- Added a new "Common Generation Options" section with a detailed table explaining parameters like `temperature`, `maxTokens`, `contextLimit`, etc., including their types and default values.
