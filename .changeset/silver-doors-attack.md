---
"@voltagent/core": patch
---

fix: user messages saving with proper content serialization

Fixed an issue where user messages were not being saved correctly to storage due to improper content formatting. The message content is now properly stringified when it's not already a string, ensuring consistent storage format across PostgreSQL and LibSQL implementations.
