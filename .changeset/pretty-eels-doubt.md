---
"@voltagent/postgres": patch
---

feat: add workflow history support to postgres

This update introduces persistence for workflow history when using a PostgreSQL database. This includes storing workflow execution details, individual steps, and timeline events. Database tables are migrated automatically, so no manual action is required.
