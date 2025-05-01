---
"@voltagent/google-ai": patch
"@voltagent/vercel-ai": patch
"@voltagent/groq-ai": patch
"@voltagent/core": patch
"@voltagent/xsai": patch
---

**API & Providers:** Standardized message content format for array inputs.

- The API (`/text`, `/stream`, `/object`, `/stream-object` endpoints) now strictly expects the `content` field within message objects (when `input` is an array) to be either a `string` or an `Array` of content parts (e.g., `[{ type: 'text', text: '...' }]`).
- The previous behavior of allowing a single content object (e.g., `{ type: 'text', ... }`) directly as the value for `content` in message arrays is no longer supported in the API schema. Raw string inputs remain unchanged.
- Provider logic (`google-ai`, `groq-ai`, `xsai`) updated to align with this stricter definition.

**Console:**

- **Added file and image upload functionality to the Assistant Chat.** Users can now attach multiple files/images via a button, preview attachments, and send them along with text messages.
- Improved the Assistant Chat resizing: Replaced size toggle buttons with a draggable handle (top-left corner).
- Chat window dimensions are now saved to local storage and restored on reload.

**Internal:**

- Added comprehensive test suites for Groq and XsAI providers.
