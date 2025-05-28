---
"@voltagent/core": patch
---

feat: improved event system architecture for better observability

We've updated the event system architecture to improve observability capabilities. The system includes automatic migrations to maintain backward compatibility, though some events may not display perfectly due to the architectural changes. Overall functionality remains stable and most features work as expected.

No action required - the system will automatically handle the migration process. If you encounter any issues, feel free to reach out on [Discord](https://s.voltagent.dev/discord) for support.

**What's Changed:**

- Enhanced event system for better observability and monitoring
- Automatic database migrations for seamless upgrades
- Improved agent history tracking and management

**Migration Notes:**

- Backward compatibility is maintained through automatic migrations
- Some legacy events may display differently but core functionality is preserved
- No manual intervention needed - migrations run automatically

**Note:**
Some events may not display perfectly due to architecture changes, but the system will automatically migrate and most functionality will work as expected.
