---
"@voltagent/internal": patch
---

refactor: remove devLogger in favor of standardized logging approach

Removed the internal `devLogger` utility to align with the new standardized logging architecture. This change simplifies the internal package and reduces code duplication by leveraging the comprehensive logging system now available in @voltagent/core and @voltagent/logger.

**Changes:**

- Removed `devLogger` from exports
- Removed development-only logging utility
- Consumers should use the logger instance provided by VoltAgent or create their own using @voltagent/logger

This is part of the logging system refactoring to provide a more consistent and powerful logging experience across all VoltAgent packages.
