---
"@voltagent/core": patch
---

Implement comprehensive error handling for streaming endpoints - #170

- **Backend**: Added error handling to `streamRoute` and `streamObjectRoute` with onError callbacks, safe stream operations, and multiple error layers (setup, iteration, stream errors)
- **Documentation**: Added detailed error handling guide with examples for fetch-based SSE streaming

Fixes issue where streaming errors weren't being communicated to frontend users, leaving them without feedback when API calls failed during streaming operations.
