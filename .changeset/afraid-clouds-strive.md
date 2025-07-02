---
"@voltagent/core": minor
---

feat: add enterprise-grade VoltOps Prompt Management platform with team collaboration and analytics

**VoltOps Prompt Management transforms VoltAgent from a simple framework into an enterprise-grade platform for managing AI prompts at scale.** Think "GitHub for prompts" with built-in team collaboration, version control, environment management, and performance analytics.

## 🎯 What's New

**🚀 VoltOps Prompt Management Platform**

- **Team Collaboration**: Non-technical team members can edit prompts via web console
- **Version Control**: Full prompt versioning with commit messages and rollback capabilities
- **Environment Management**: Promote prompts from development → staging → production with labels
- **Template Variables**: Dynamic `{{variable}}` substitution with validation
- **Performance Analytics**: Track prompt effectiveness, costs, and usage patterns

## 📋 Usage Examples

**Basic VoltOps Setup:**

```typescript
import { Agent, VoltAgent, VoltOpsClient } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// 1. Initialize VoltOps client
const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTOPS_PUBLIC_KEY,
  secretKey: process.env.VOLTOPS_SECRET_KEY,
});

// 2. Create agent with VoltOps prompts
const supportAgent = new Agent({
  name: "SupportAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: async ({ prompts }) => {
    return await prompts.getPrompt({
      promptName: "customer-support-prompt",
      label: process.env.NODE_ENV === "production" ? "production" : "development",
      variables: {
        companyName: "VoltAgent Corp",
        tone: "friendly and professional",
        supportLevel: "premium",
      },
    });
  },
});

// 3. Initialize VoltAgent with global VoltOps client
const voltAgent = new VoltAgent({
  agents: { supportAgent },
  voltOpsClient: voltOpsClient,
});
```

**Advanced Features - Chat Prompts & Environment Management:**

```typescript
// Multi-message chat prompts with environment-specific behavior
const chatAgent = new Agent({
  name: "ChatAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: async ({ prompts }) => {
    // Automatically selects correct environment version
    const envLabel = process.env.NODE_ENV === "production" ? "production" : "development";

    return await prompts.getPrompt({
      promptName: "chat-support-conversation",
      label: envLabel,
      variables: {
        agentRole: "customer success specialist",
        companyName: "VoltAgent",
        supportTier: "enterprise",
        currentTime: new Date().toISOString(),
      },
      // Per-prompt cache override
      promptCache: {
        enabled: true,
        ttl: 600, // 10 minutes for stable prompts
      },
    });
  },
});
```

**Graceful Error Handling & Fallbacks:**

```typescript
const resilientAgent = new Agent({
  name: "ResilientAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: async ({ prompts }) => {
    try {
      return await prompts.getPrompt({
        promptName: "primary-prompt",
      });
    } catch (error) {
      console.error("VoltOps prompt failed, using fallback:", error);

      // Automatic fallback to static prompt
      return "You are a helpful AI assistant. Please help the user with their question professionally and efficiently.";
    }
  },
});
```
