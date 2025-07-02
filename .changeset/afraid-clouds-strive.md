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
