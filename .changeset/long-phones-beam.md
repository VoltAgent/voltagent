---
"@voltagent/vercel-ui": patch
---

fix: properly separate subagent text streams in UI message conversion - #508

- Added agent transition detection in `toUIMessageStream` adapter
- Text streams from different agents (subagents and supervisor) now have separate text part IDs
- Each agent transition ends the current text stream and starts a new one with a unique ID
- Emit `data-subagent` metadata events when switching to a subagent
- Reset subagent tracking on stream flush for clean state

This fix ensures that text-delta events from different agents can be distinguished in the UI, preventing text from multiple agents being merged into a single text part. The fullStream now properly separates each agent's response with unique IDs (e.g., id:"1" for MathAssistant, id:"2" for DateTimeAssistant, id:"3" for Supervisor).

Fixes the issue where parallel subagent execution would result in mixed text streams that couldn't be distinguished by source agent.
