---
"@voltagent/core": patch
---

feat: major refactor of event system and agent architecture

**BREAKING CHANGES:**

- Complete overhaul of the event system architecture
- New immutable timeline event system for agent and tool operations
- Enhanced agent history management with metadata support
- Restructured agent history with timeline events table and indexes

**New Features:**

- Implement new event types: `agent:start`, `agent:success`, `agent:error`
- Add asynchronous `updateHistoryEntry` method for better event handling
- Enhanced telemetry client with improved API interactions
- Better error handling and event metadata support

**Improvements:**

- Streamlined agent history operations
- Improved memory management and performance
- Enhanced OpenTelemetry integration
- Better type safety and error handling
