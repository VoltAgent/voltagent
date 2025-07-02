---
"@voltagent/core": patch
---

feat: introduce VoltOpsClient as unified replacement for deprecated telemetryExporter

**VoltOpsClient** is the new unified platform client for VoltAgent that replaces the deprecated `telemetryExporter`.

## 📋 Usage

```typescript
import { Agent, VoltAgent, VoltOpsClient } from "@voltagent/core";

const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTOPS_PUBLIC_KEY,
  secretKey: process.env.VOLTOPS_SECRET_KEY,
  observability: true, // Enable observability - default is true
  prompts: true, // Enable prompt management - default is true
});

const voltAgent = new VoltAgent({
  agents: { myAgent },
  voltOpsClient: voltOpsClient, // ✅ New approach
});
```

## 🔄 Migration from telemetryExporter

Replace the deprecated `telemetryExporter` with the new `VoltOpsClient`:

```diff
import { Agent, VoltAgent } from "@voltagent/core";
- import { VoltAgentExporter } from "@voltagent/core";
+ import { VoltOpsClient } from "@voltagent/core";

const voltAgent = new VoltAgent({
  agents: { myAgent },
- telemetryExporter: new VoltAgentExporter({
+ voltOpsClient: new VoltOpsClient({
    publicKey: process.env.VOLTOPS_PUBLIC_KEY,
    secretKey: process.env.VOLTOPS_SECRET_KEY,
-   baseUrl: "https://api.voltagent.dev",
  }),
});
```

## ⚠️ Deprecation Notice

`telemetryExporter` is now **deprecated** and will be removed in future versions:

```typescript
// ❌ Deprecated - Don't use
new VoltAgent({
  agents: { myAgent },
  telemetryExporter: new VoltAgentExporter({...}), // Deprecated!
});

// ✅ Correct approach
new VoltAgent({
  agents: { myAgent },
  voltOpsClient: new VoltOpsClient({...}),
});
```

**For migration guide, see:** `/docs/observability/developer-console#migration-guide`

## 🔧 Advanced Configuration

```typescript
const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTOPS_PUBLIC_KEY,
  secretKey: process.env.VOLTOPS_SECRET_KEY,
  baseUrl: "https://api.voltagent.dev", // Default
  observability: true, // Enable observability export - default is true
  prompts: false, // Observability only - default is true
  promptCache: {
    enabled: true, // Enable prompt cache - default is true
    ttl: 300, // 5 minute cache - default is 300
    maxSize: 100, // Max size of the cache - default is 100
  },
});
```
