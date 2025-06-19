---
"@voltagent/core": patch
---

feat: add dynamic agent parameters with userContext support - #272

Added dynamic agent parameters functionality that allows agents to adapt their behavior, models, and tools based on runtime context. This enables personalized, multi-tenant, and role-based AI experiences.

## Features

- **Dynamic Instructions**: Agent instructions that change based on user context
- **Dynamic Models**: Different AI models based on subscription tiers or user roles
- **Dynamic Tools**: Role-based tool access and permissions
- **REST API Integration**: Full userContext support via REST endpoints
- **VoltOps Integration**: Visual testing interface for dynamic agents

## Usage

```typescript
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const dynamicAgent = new Agent({
  name: "Adaptive Assistant",

  // Dynamic instructions based on user context
  instructions: ({ userContext }) => {
    const role = (userContext.get("role") as string) || "user";
    const language = (userContext.get("language") as string) || "English";

    if (role === "admin") {
      return `You are an admin assistant with special privileges. Respond in ${language}.`;
    } else {
      return `You are a helpful assistant. Respond in ${language}.`;
    }
  },

  // Dynamic model selection based on subscription tier
  model: ({ userContext }) => {
    const tier = (userContext.get("tier") as string) || "free";

    switch (tier) {
      case "premium":
        return openai("gpt-4o");
      case "pro":
        return openai("gpt-4o-mini");
      default:
        return openai("gpt-3.5-turbo");
    }
  },

  // Dynamic tools based on user role
  tools: ({ userContext }) => {
    const role = (userContext.get("role") as string) || "user";

    if (role === "admin") {
      return [basicTool, adminTool];
    } else {
      return [basicTool];
    }
  },

  llm: new VercelAIProvider(),
});

// Usage with userContext
const userContext = new Map([
  ["role", "admin"],
  ["language", "Spanish"],
  ["tier", "premium"],
]);

const response = await dynamicAgent.generateText("Help me manage the system", { userContext });
```

## REST API Integration

Dynamic agents work seamlessly with REST API endpoints:

```bash
# POST /agents/my-agent/text
curl -X POST http://localhost:3141/agents/my-agent/text \
     -H "Content-Type: application/json" \
     -d '{
       "input": "I need admin access",
       "options": {
         "userContext": {
           "role": "admin",
           "language": "Spanish",
           "tier": "premium"
         }
       }
     }'
```

Perfect for multi-tenant applications, role-based access control, subscription tiers, internationalization, and A/B testing scenarios.
