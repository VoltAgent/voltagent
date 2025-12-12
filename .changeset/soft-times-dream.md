---
"create-voltagent-app": patch
---

feat: use LibSQL for persistent observability in project template

Previously, projects created with `create-voltagent-app` used in-memory observability storage, which meant traces and spans were lost on restart.

Now the template uses `LibSQLObservabilityAdapter` to persist observability data to `.voltagent/observability.db`, matching the existing persistent memory setup. This ensures agent traces, spans, and logs are retained across restarts for better debugging and monitoring during development.
