---
"@voltagent/vercel-ui": patch
---

fix: Handle ToolResultPart in message conversion

Fixed TypeScript build error when converting BaseMessage content that includes ToolResultPart. The converter now properly filters out tool-result parts from user/assistant messages since these parts should only appear in messages with role="tool".

This fix ensures compatibility with the new client-side tools feature in @voltagent/core.
