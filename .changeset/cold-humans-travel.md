---
"@voltagent/core": patch
---

fix: auto-register standalone Agent VoltOps client for remote observability export

- When an `Agent` is created with `voltOpsClient` and no global client is registered, the agent now seeds `AgentRegistry` with that client.
- This enables remote OTLP trace/log exporters that resolve credentials via global registry in standalone `new Agent(...)` setups (without `new VoltAgent(...)`).
- Existing global client precedence is preserved; agent-level client does not override an already configured global client.
- Added coverage in `client-priority.spec.ts` for both auto-register and non-override scenarios.
