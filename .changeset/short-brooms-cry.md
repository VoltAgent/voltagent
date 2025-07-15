---
"@voltagent/supabase": patch
---

feat: add workflow history support

This update introduces persistence for workflow history in Supabase, including execution details, steps, and timeline events.

### Manual Migration Required

- **Database Migration Required**: This version introduces new tables (`voltagent_memory_workflow_history`, `voltagent_memory_workflow_steps`, and `voltagent_memory_workflow_timeline_events`) to your Supabase database. After updating, you must run the SQL migration script logged to the console in your Supabase SQL Editor to apply the changes.
