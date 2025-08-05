---
"@voltagent/core": patch
---

feat: add VoltOps API key validation and improved auto-configuration

### What's New

- **API Key Validation**: VoltAgent now validates VoltOps API keys to ensure they have the correct format (must start with `pk_` for public keys and `sk_` for secret keys)
- **Smart Auto-Configuration**: The VoltAgent constructor only creates VoltOpsClient when valid API keys are detected
- **Dummy Key Protection**: Placeholder values like "your-public-key" are now properly rejected

### Changes

- Added `isValidVoltOpsKeys()` utility function to validate API key formats
- Updated VoltAgent constructor to check key validity before auto-configuring VoltOpsClient
- Environment variables with invalid keys are now silently ignored instead of causing errors

### Usage

```typescript
// Valid keys - VoltOpsClient will be auto-configured
// .env file:
// VOLTAGENT_PUBLIC_KEY=your-public-key
// VOLTAGENT_SECRET_KEY=your-secret-key

// Invalid keys - VoltOpsClient will NOT be created
// .env file:
// VOLTAGENT_PUBLIC_KEY=your-public-key  // ❌ Rejected
// VOLTAGENT_SECRET_KEY=your-secret-key  // ❌ Rejected

const voltAgent = new VoltAgent({
  agents: { myAgent },
  // No need to manually configure VoltOpsClient if valid keys exist in environment
});
```

This change improves the developer experience by preventing confusion when placeholder API keys are present in the environment variables.
