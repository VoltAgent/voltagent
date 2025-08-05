---
"@voltagent/core": patch
---

feat: improve /setup-observability endpoint to handle commented .env entries

### What's New

The `/setup-observability` API endpoint now intelligently updates existing .env files by replacing commented VoltOps key entries instead of creating duplicates.

### Changes

- **Smart .env Updates**: When setting up observability, the endpoint now finds and updates commented entries like `# VOLTAGENT_PUBLIC_KEY=`
- **No More Duplicates**: Prevents duplicate key entries by updating existing lines (both commented and active)
- **Cleaner Configuration**: Results in a cleaner .env file without confusing duplicate entries

### Before

```bash
# VoltAgent Observability (Optional)
# VOLTAGENT_PUBLIC_KEY=
# VOLTAGENT_SECRET_KEY=

# ... later in file ...

# VoltAgent Observability
VOLTAGENT_PUBLIC_KEY=your-public-key
VOLTAGENT_SECRET_KEY=your-secret-key
```

### After

```bash
# VoltAgent Observability (Optional)
VOLTAGENT_PUBLIC_KEY=your-public-key
VOLTAGENT_SECRET_KEY=your-secret-key
```

This change improves the developer experience by maintaining a clean .env file structure when setting up observability through the VoltOps Console.
