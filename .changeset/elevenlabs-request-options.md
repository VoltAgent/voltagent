---
"@voltagent/voice": patch
---

fix: apply `options.timeout` and `options.maxRetries` in `ElevenLabsVoiceProvider`

The options were declared but never passed to the ElevenLabs SDK. They are now forwarded as request options to `generate`, `speechToText.convert` and `voices.getAll` (timeout converted from milliseconds to seconds).
