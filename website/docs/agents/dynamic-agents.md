---
title: Dynamic Agents
slug: /agents/dynamic-agents
---

# Dynamic Agents

Dynamic Agents allow you to create adaptive AI agents that change their behavior, capabilities, and configuration based on runtime context. Instead of having fixed instructions, models, or tools, you can define functions that dynamically determine these properties based on user context, request parameters, or any other runtime information.

## Why Use Dynamic Agents?

**Why?** To create personalized, context-aware AI experiences that adapt to different users, roles, subscription tiers, languages, or any other runtime conditions without creating separate agent instances.

Dynamic agents are perfect for:

- **Multi-tenant applications** where different users need different capabilities
- **Role-based access control** where admins get different tools than regular users
- **Subscription tiers** where premium users get access to better models
- **Internationalization** where responses adapt to user's language
- **A/B testing** where different users get different model configurations

## Basic Dynamic Agent

Here's a simple example of a dynamic agent that changes its behavior based on user role:

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const dynamicAgent = new Agent({
  name: "Adaptive Assistant",

  // Dynamic instructions based on user context
  instructions: ({ context }) => {
    const role = (context.get("role") as string) || "user";
    const language = (context.get("language") as string) || "English";

    if (role === "admin") {
      return `You are an admin assistant with special privileges. Respond in ${language}.`;
    } else {
      return `You are a helpful assistant. Respond in ${language}.`;
    }
  },

  model: openai("gpt-4o"),
});
```

## Dynamic Properties

Dynamic agents support three main dynamic properties:

### Dynamic Instructions

**Why?** To personalize the agent's personality, capabilities, and behavior based on user context.

```ts
const agent = new Agent({
  name: "Multilingual Support Agent",

  instructions: ({ context }) => {
    const language = (context.get("language") as string) || "English";
    const supportTier = (context.get("supportTier") as string) || "basic";

    let baseInstructions = `You are a customer support agent. Respond in ${language}.`;

    if (supportTier === "premium") {
      baseInstructions += " You can offer advanced troubleshooting and priority support.";
    } else {
      baseInstructions += " Provide standard support within basic guidelines.";
    }

    return baseInstructions;
  },

  model: openai("gpt-4o"),
});
```

### Dynamic Models

**Why?** To allocate different AI models based on user subscription, request complexity, or cost considerations.

```ts
const agent = new Agent({
  name: "Tier-Based Assistant",
  instructions: "You are a helpful assistant.",

  // Different models for different subscription tiers
  model: ({ context }) => {
    const tier = (context.get("tier") as string) || "free";

    switch (tier) {
      case "premium":
        return openai("gpt-4o");
      case "pro":
        return openai("gpt-4o-mini");
      default:
        return openai("gpt-3.5-turbo");
    }
  },
});
```

### Dynamic Tools

**Why?** To provide different capabilities based on user permissions, roles, or subscription levels.

```ts
import { createTool } from "@voltagent/core";
import { z } from "zod";

// Regular user tool
const basicTool = createTool({
  name: "get_help",
  description: "Get basic help information",
  parameters: z.object({
    topic: z.string().describe("Help topic"),
  }),
  execute: async ({ topic }) => {
    return `Here's basic help about ${topic}`;
  },
});

// Admin-only tool
const adminTool = createTool({
  name: "admin_action",
  description: "Perform administrative actions",
  parameters: z.object({
    action: z.string().describe("Admin action to perform"),
  }),
  execute: async ({ action }) => {
    return `Admin action performed: ${action}`;
  },
});

const agent = new Agent({
  name: "Role-Based Agent",
  instructions: "You are an assistant with role-based capabilities.",

  // Different tools based on user role
  tools: ({ context }) => {
    const role = (context.get("role") as string) || "user";

    if (role === "admin") {
      return [basicTool, adminTool]; // Admins get both tools
    } else {
      return [basicTool]; // Regular users get basic tools only
    }
  },

  model: openai("gpt-4o"),
});
```

## Using Dynamic Agents

To use a dynamic agent, pass the `context` when calling generation methods:

```ts
// Create context with relevant information
const context = new Map<string, unknown>();
context.set("role", "admin");
context.set("language", "Spanish");
context.set("tier", "premium");
context.set("company", "TechCorp");

// Generate response with context
const response = await dynamicAgent.generateText("Help me manage the system settings", {
  context,
});

console.log(response.text);
// The agent will respond in Spanish, with admin capabilities,
// using the premium model, and have access to admin tools
```

You can also use it with streaming:

```ts
const streamResponse = await dynamicAgent.streamText("What products are available?", {
  context: new Map([
    ["role", "customer"],
    ["language", "French"],
    ["tier", "basic"],
  ]),
});

for await (const chunk of streamResponse.textStream) {
  process.stdout.write(chunk);
}
```

## REST API Usage

Dynamic agents can also be used via the VoltAgent REST API by passing `context` in the request options. This is perfect for web frontends, mobile apps, or any system that needs to interact with dynamic agents over HTTP.

### API Request Format

Pass the `context` object within the `options` field of your API request:

```json
{
  "input": "Your message to the agent",
  "options": {
    "context": {
      "role": "admin",
      "language": "Spanish",
      "tier": "premium"
    },
    "temperature": 0.7,
    "maxTokens": 500
  }
}
```

### REST API Examples

**Basic Text Generation:**

```bash
# Admin user requesting help in Spanish
curl -X POST http://localhost:3141/agents/YOUR_AGENT_NAME/text \
     -H "Content-Type: application/json" \
     -d '{
       "input": "I need to update system settings",
       "options": {
         "context": {
           "role": "admin",
           "language": "Spanish",
           "tier": "enterprise"
         }
       }
     }'
```

**Streaming with Real-time Context:**

```bash
# Stream response for different user roles
curl -N -X POST http://localhost:3141/agents/YOUR_AGENT_NAME/stream \
     -H "Content-Type: application/json" \
     -d '{
       "input": "Write a summary of our quarterly results",
       "options": {
         "context": {
           "role": "manager",
           "department": "finance",
           "accessLevel": "confidential",
           "language": "English"
         }
       }
     }'
```

## VoltOps Integration

**Using Dynamic Agents with VoltOps Dashboard**

VoltOps provides a user-friendly interface for testing and monitoring dynamic agents. You can easily pass different context values and see how your agent adapts in real-time.

<!-- GIF PLACEHOLDER: VoltOps Dynamic Agents Demo -->

![VoltOps Dynamic Agents Demo](https://cdn.voltagent.dev/docs/user-context-demo.gif)

The VoltOps interface allows you to:

- Set context values through a visual form
- Test different user roles and configurations
- Monitor how dynamic properties change based on context
- Debug and optimize your dynamic agent logic

## Best Practices

### Context Validation

Always validate and provide defaults for context values:

```ts
instructions: ({ context }) => {
  // Always provide defaults and validate types
  const role = (context.get("role") as string) || "user";
  const language = (context.get("language") as string) || "English";

  // Validate known values
  const validRoles = ["admin", "support", "customer"];
  const actualRole = validRoles.includes(role) ? role : "customer";

  return `You are a ${actualRole} assistant. Respond in ${language}.`;
};
```

### Performance Considerations

Dynamic functions are called for every request, so keep them lightweight:

```ts
// ✅ Good - Simple and fast
model: ({ context }) => {
  const tier = context.get('tier') as string;
  return tier === 'premium' ? openai('gpt-4o') : openai('gpt-3.5-turbo');
},

// ❌ Avoid - Heavy computation in dynamic functions
model: async ({ context }) => {
  // Don't make API calls or heavy computations here
  const userProfile = await fetchUserFromDatabase(context.get('userId'));
  return determineModelFromProfile(userProfile); // This will slow down every request
}
```

### Security

Be careful with user-provided context values:

```ts
instructions: ({ context }) => {
  const role = context.get("role") as string;

  // ✅ Use allowlists for security-sensitive operations
  const allowedRoles = ["admin", "support", "customer"];
  const safeRole = allowedRoles.includes(role) ? role : "customer";

  return `You are a ${safeRole} assistant.`;
};
```

### Context Structure

Use consistent context key naming across your application:

```ts
// ✅ Consistent naming convention
const createUserContext = (user: User) => {
  const context = new Map<string, unknown>();
  context.set("user.id", user.id);
  context.set("user.role", user.role);
  context.set("user.tier", user.subscriptionTier);
  context.set("user.language", user.preferredLanguage);
  context.set("request.timestamp", Date.now());
  return context;
};
```

## Advanced Patterns

### Conditional Dynamic Properties

You can make properties dynamic only when needed:

```ts
const agent = new Agent({
  name: "Conditionally Dynamic Agent",

  // Static instructions most of the time
  instructions: "You are a helpful assistant.",

  // But dynamic model when user context is provided
  model: ({ context }) => {
    // If no tier specified, use default static model
    if (!context.has("tier")) {
      return openai("gpt-4o-mini"); // Default model
    }

    // Otherwise, choose based on tier
    const tier = context.get("tier") as string;
    return tier === "premium" ? openai("gpt-4o") : openai("gpt-3.5-turbo");
  },

  // model is selected dynamically above
});
```

### Context Inheritance

Pass context between related operations:

```ts
// Main agent with context
const parentResponse = await dynamicAgent.generateText("Create a summary", {
  context: myContext,
});

// Sub-agent inherits the same context
const detailResponse = await detailAgent.generateText(
  "Provide more details",
  { context: myContext } // Same context for consistency
);
```

## Error Handling

Handle errors gracefully in dynamic functions:

```ts
model: ({ context }) => {
  try {
    const tier = context.get("tier") as string;

    if (tier === "premium") {
      return openai("gpt-4o");
    }
    return openai("gpt-3.5-turbo");
  } catch (error) {
    console.warn("Error in dynamic model selection:", error);
    // Fallback to safe default
    return openai("gpt-3.5-turbo");
  }
};
```
