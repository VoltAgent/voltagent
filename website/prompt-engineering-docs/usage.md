---
title: Usage
---

# Using Prompts in Agents

This guide covers how to integrate VoltOps prompts into your VoltAgent agents, including setup, fetching prompts, using labels, template variables, and caching strategies.

## Setup

### Get API Keys

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/docs/voltop-docs/observability-settings.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

1. Sign up at [console.voltagent.dev](https://console.voltagent.dev/)
2. Navigate to Settings → [Projects](https://console.voltagent.dev/settings/projects)
3. Copy your public and secret keys

### Configure Environment

```bash
VOLTAGENT_PUBLIC_KEY=pk_your_public_key_here
VOLTAGENT_SECRET_KEY=sk_your_secret_key_here
```

### Initialize VoltOpsClient

```typescript
import { VoltOpsClient } from "@voltagent/core";

const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
});
```

## Basic Usage

Fetch prompts using the `prompts` helper available in dynamic instructions:

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, VoltOpsClient } from "@voltagent/core";

const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
});

const agent = new Agent({
  name: "SupportAgent",
  model: openai("gpt-4o-mini"),
  instructions: async ({ prompts }) => {
    return await prompts.getPrompt({
      promptName: "customer-support-prompt",
    });
  },
});

new VoltAgent({
  agents: { agent },
  voltOpsClient: voltOpsClient,
});
```

### Agent-Level VoltOpsClient

Alternatively, attach the client directly to the agent:

```typescript
const agent = new Agent({
  name: "SupportAgent",
  model: openai("gpt-4o-mini"),
  instructions: async ({ prompts }) => {
    return await prompts.getPrompt({
      promptName: "customer-support-prompt",
    });
  },
  voltOpsClient: voltOpsClient,
});
```

### Direct VoltOpsClient Access

For standalone usage outside of agents:

```typescript
const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
});

const content = await voltOpsClient.prompts.getPrompt({
  promptName: "customer-support-prompt",
});

console.log("Prompt content:", content);
```

## Environment Labels

Use labels to target specific prompt versions for different environments:

```typescript
const agent = new Agent({
  name: "ProductionAgent",
  model: openai("gpt-4o-mini"),
  instructions: async ({ prompts }) => {
    const label = process.env.NODE_ENV === "production" ? "production" : "development";

    return await prompts.getPrompt({
      promptName: "customer-support-prompt",
      label: label,
    });
  },
});
```

### Available Labels

| Label         | Purpose                 |
| ------------- | ----------------------- |
| `production`  | Live production traffic |
| `staging`     | Pre-production testing  |
| `development` | Active development      |
| `testing`     | QA environments         |
| `latest`      | Most recent version     |

You can also use custom labels (e.g., `beta`, `canary`, `region-eu`).

## Template Variables

Pass dynamic values to replace template variables in prompts:

```typescript
const agent = new Agent({
  name: "DynamicAgent",
  model: openai("gpt-4o-mini"),
  instructions: async ({ prompts, context }) => {
    return await prompts.getPrompt({
      promptName: "customer-support-prompt",
      label: "production",
      variables: {
        companyName: "VoltAgent Corp",
        userName: context.get("userName") || "Guest",
        tier: context.get("subscriptionTier") || "free",
      },
    });
  },
});
```

### Using with Agent Context

```typescript
const userContext = new Map();
userContext.set("userName", "Alice");
userContext.set("subscriptionTier", "premium");

const response = await agent.generateText("I need help", {
  context: userContext,
});
```

### Variable Sanitization

Sanitize user-provided variables to prevent prompt injection:

```typescript
instructions: async ({ prompts, context }) => {
  const sanitizedUserName =
    context.get("userName")?.replace(/[<>]/g, "")?.substring(0, 50) || "Guest";

  return await prompts.getPrompt({
    promptName: "personalized-greeting",
    variables: { userName: sanitizedUserName },
  });
};
```

## Caching

VoltOps supports two levels of caching to reduce API calls and improve performance.

### Global Cache

Configure caching at the VoltOpsClient level:

```typescript
const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
  prompts: true,
  promptCache: {
    enabled: true,
    ttl: 300, // Seconds until expiration
    maxSize: 100, // Maximum cached prompts
  },
});
```

### Per-Prompt Cache Override

Override cache settings for individual fetches:

```typescript
// Disable cache for this specific fetch
return await prompts.getPrompt({
  promptName: "customer-support-prompt",
  promptCache: { enabled: false },
});

// Use longer TTL for stable prompts
return await prompts.getPrompt({
  promptName: "system-instructions",
  promptCache: { ttl: 3600, enabled: true },
});
```

### Clear Cache

Force refresh by clearing the cache:

```typescript
voltOpsClient.prompts.clearCache();
```

### Cache Strategy Recommendations

| Prompt Type              | TTL      | Rationale                                     |
| ------------------------ | -------- | --------------------------------------------- |
| High-frequency greetings | 60s      | Frequently accessed, small updates acceptable |
| System instructions      | 3600s    | Rarely changes, benefit from longer cache     |
| Personalized prompts     | Disabled | Dynamic content, always fetch fresh           |

```typescript
// High-frequency prompts: short TTL
await prompts.getPrompt({
  promptName: "chat-greeting",
  promptCache: { ttl: 60, enabled: true },
});

// Stable prompts: long TTL
await prompts.getPrompt({
  promptName: "system-instructions",
  promptCache: { ttl: 3600, enabled: true },
});

// Dynamic prompts: no cache
await prompts.getPrompt({
  promptName: "personalized-prompt",
  promptCache: { enabled: false },
  variables: { userId: dynamicUserId },
});
```

### Preloading Prompts

Preload critical prompts at application startup:

```typescript
const criticalPrompts = ["welcome-message", "error-handler", "main-agent"];

await Promise.all(criticalPrompts.map((name) => prompts.getPrompt({ promptName: name })));
```

## Chat Prompts

Chat prompts define multi-message conversations with role-based structure.

### Fetching Chat Prompts

```typescript
const agent = new Agent({
  name: "ChatAgent",
  model: openai("gpt-4o-mini"),
  instructions: async ({ prompts }) => {
    return await prompts.getPrompt({
      promptName: "chat-support-prompt",
      variables: {
        agentRole: "customer support specialist",
        companyName: "VoltAgent Corp",
      },
    });
  },
});
```

### Chat Prompt Structure

Chat prompts return a structure with messages:

```typescript
{
  type: "chat",
  messages: [
    { role: "system", content: "You are a customer support specialist." },
    { role: "user", content: "Hello, I need help." },
    { role: "assistant", content: "Hello! How can I assist you today?" }
  ]
}
```

## Error Handling

Implement fallback strategies for network failures or missing prompts:

```typescript
instructions: async ({ prompts }) => {
  try {
    return await prompts.getPrompt({
      promptName: "primary-prompt",
      timeout: 5000,
    });
  } catch (error) {
    console.error("Prompt fetch failed:", error);
    return "You are a helpful assistant."; // Fallback
  }
};
```

### Common Errors

#### Prompt Not Found

```typescript
// Error: Prompt 'weather-prompt' not found

// Solution: Verify prompt name exists in VoltOps console
instructions: async ({ prompts }) => {
  try {
    return await prompts.getPrompt({ promptName: "weather-prompt" });
  } catch (error) {
    console.error("Prompt fetch failed:", error);
    return "Fallback instructions";
  }
};
```

#### Missing Variables

```typescript
// Error: Variable 'userName' not found in template

// Solution: Provide all required variables with defaults
return await prompts.getPrompt({
  promptName: "greeting-prompt",
  variables: {
    userName: context.get("userName") || "Guest",
    currentTime: new Date().toISOString(),
  },
});
```

#### Authentication Failed

```typescript
// Error: Authentication failed

// Solution: Verify environment variables
console.log("Public Key:", process.env.VOLTAGENT_PUBLIC_KEY?.substring(0, 8) + "...");
console.log("Secret Key:", process.env.VOLTAGENT_SECRET_KEY ? "Set" : "Missing");
```

#### Stale Cache

```typescript
// Problem: Old prompt version still in use after update

// Solution 1: Clear cache
voltOpsClient.prompts.clearCache();

// Solution 2: Disable cache temporarily
return await prompts.getPrompt({
  promptName: "urgent-prompt",
  promptCache: { enabled: false },
});

// Solution 3: Wait for TTL expiration
```

## Debugging

Test prompt fetching independently:

```typescript
const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
});

try {
  const prompt = await voltOpsClient.prompts.getPrompt({
    promptName: "test-prompt",
  });
  console.log("Success:", prompt);
} catch (error) {
  console.error("Failed:", error);
}
```

## Complete Example

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, VoltOpsClient } from "@voltagent/core";

const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
  prompts: true,
  promptCache: {
    enabled: true,
    ttl: 300,
  },
});

const supportAgent = new Agent({
  name: "SupportAgent",
  model: openai("gpt-4o-mini"),
  instructions: async ({ prompts, context }) => {
    const environment = process.env.NODE_ENV === "production" ? "production" : "development";

    try {
      return await prompts.getPrompt({
        promptName: "customer-support-agent",
        label: environment,
        variables: {
          companyName: "VoltAgent Corp",
          userName: context.get("userName") || "Guest",
          tier: context.get("subscriptionTier") || "free",
          supportHours: "9 AM - 6 PM EST",
        },
      });
    } catch (error) {
      console.error("Failed to fetch prompt:", error);
      return "You are a helpful customer support agent. Assist users with their questions.";
    }
  },
});

new VoltAgent({
  agents: { supportAgent },
  voltOpsClient: voltOpsClient,
});
```

## API Reference

### getPrompt Options

| Option        | Type   | Required | Description                                   |
| ------------- | ------ | -------- | --------------------------------------------- |
| `promptName`  | string | Yes      | Name of the prompt to fetch                   |
| `label`       | string | No       | Environment label (production, staging, etc.) |
| `variables`   | object | No       | Key-value pairs for template substitution     |
| `promptCache` | object | No       | Per-request cache configuration               |
| `timeout`     | number | No       | Request timeout in milliseconds               |

### PromptCache Options

| Option    | Type    | Default | Description             |
| --------- | ------- | ------- | ----------------------- |
| `enabled` | boolean | true    | Enable/disable caching  |
| `ttl`     | number  | 300     | Time-to-live in seconds |
| `maxSize` | number  | 100     | Maximum cached entries  |
