# Prompt Management

## Overview

VoltAgent provides a three-tier prompt management system that scales from simple prototypes to enterprise-grade production deployments. Choose the approach that best fits your current needs and easily migrate as your requirements grow.

### The Three Approaches

| Approach                 | Best For                 | Setup Time | Team Size       | Flexibility |
| ------------------------ | ------------------------ | ---------- | --------------- | ----------- |
| **Static Instructions**  | Prototypes, simple tools | 0 minutes  | 1-2 developers  | Low         |
| **Dynamic Instructions** | Context-aware apps       | 5 minutes  | 2-5 developers  | High        |
| **VoltOps Management**   | Production teams         | 15 minutes | 3+ team members | Enterprise  |

## Static Instructions

### Simple Text Instructions

```typescript
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const weatherAgent = new Agent({
  name: "WeatherAgent",
  model: openai("gpt-4o-mini"),
  instructions:
    "You are a customer support agent. Help users with their questions politely and efficiently.",
});
```

### Chat Instruction Objects

```typescript
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const chatAgent = new Agent({
  name: "ChatAgent",
  model: openai("gpt-4o-mini"),
  instructions: () => {
    return {
      type: "chat",
      messages: [
        {
          role: "system",
          content: "some system prompt",
        },
      ],
    };
  },
});
```

#### Provider Metadata Example

```typescript
import { Agent } from "@voltagent/core";
import { anthropic } from "@ai-sdk/anthropic";

const cachedSystemAgent = new Agent({
  name: "CacheableSystem",
  model: anthropic("claude-3-7-sonnet-20250219"),
  instructions: () => {
    return {
      type: "chat",
      messages: [
        {
          role: "system",
          content: "some system prompt",
          providerOptions: {
            anthropic: {
              cacheControl: { type: "ephemeral", ttl: "5m" },
            },
          },
        },
      ],
    };
  },
});
```

### What it is

Simple string-based instructions that remain constant throughout your agent's lifecycle. This is the most straightforward approach where you hardcode your agent's behavior directly in your application code.

**Real-world example**: A documentation chatbot that always behaves the same way regardless of user, time, or context.

### When to use

**✅ Perfect for:**

- **MVP/Prototyping**: Getting your agent working quickly without infrastructure overhead
- **Simple task-specific agents**: Email summarizers, code formatters, static content generators
- **Educational projects**: Learning VoltAgent basics without complexity
- **Single-purpose tools**: Agents that perform one specific task consistently

**❌ Avoid when:**

- You need different behavior for different users
- Your agent needs to adapt based on time, location, or context
- Multiple team members need to edit prompts
- You're planning to A/B test different approaches
- Your application serves multiple customer segments

### Pros & Cons

| Pros                        | Cons                         |
| --------------------------- | ---------------------------- |
| Simple and straightforward  | No runtime flexibility       |
| No external dependencies    | No version control           |
| Perfect for getting started | Hard to update in production |
| Immediate deployment        | No analytics or monitoring   |

## 2. Dynamic Instructions with Context

**Function-based instructions with userTier:**

```typescript
const supportAgent = new Agent({
  name: "SupportAgent",
  model: openai("gpt-4o-mini"),
  instructions: async ({ context }) => {
    const userTier = context.get("userTier") || "basic";

    if (userTier === "premium") {
      return "You are a premium customer support agent. Provide detailed explanations, offer multiple solutions, and prioritize this customer's requests. Be thorough and professional.";
    } else {
      return "You are a customer support agent. Provide helpful but concise answers to user questions. Be friendly and efficient.";
    }
  },
});
```

**Using the agent with context:**

```typescript
// Premium user gets different treatment
const premiumContext = new Map();
premiumContext.set("userTier", "premium");

const premiumResponse = await supportAgent.generateText("I need help with my order", {
  context: premiumContext,
});

// Basic user gets standard support
const basicContext = new Map();
basicContext.set("userTier", "basic");

const basicResponse = await supportAgent.generateText("I need help with my order", {
  context: basicContext,
});
```

### What it is

Function-based instructions that generate prompts dynamically based on runtime context, user data, and application state. Your agent's behavior adapts in real-time without external dependencies.

**Real-world examples**:

- E-commerce support agent that behaves differently for VIP vs. regular customers
- Educational tutor that adjusts complexity based on student level
- Multi-tenant SaaS agent that uses different brand voices per customer

### When to use

**✅ Perfect for:**

- **User-specific experiences**: Different prompt behavior per user tier, role, or preferences
- **Context-dependent logic**: Time-sensitive responses, location-based customization
- **Multi-tenant applications**: Different behavior per customer/organization
- **A/B testing setup**: Conditional prompt logic for experimentation
- **Privacy-conscious applications**: No external prompt management needed

**❌ Consider alternatives when:**

- Multiple non-technical team members need to edit prompts
- You need detailed prompt analytics and version history
- Your team needs collaborative prompt development
- You want to update prompts without code deployments
- Complex prompt templates that would benefit from a visual editor

### Pros & Cons

| Pros                                         | Cons                             |
| -------------------------------------------- | -------------------------------- |
| Full runtime flexibility                     | More complex code                |
| Access to user context and application state | Harder to debug prompts          |
| Conditional prompt logic                     | No centralized prompt management |
| No external dependencies                     | No built-in analytics            |
| Immediate updates                            |                                  |

## 3. VoltOps Prompt Management

VoltOps provides a complete prompt management platform with version control, team collaboration, and analytics. Let's walk through setting it up step by step.

### Step 1: Sign Up and Get API Keys

1. **Sign up** at [console.voltagent.dev](https://console.voltagent.dev/)
2. **Create a project** or select an existing one
3. **Get your API keys** from Settings → [Projects](https://console.voltagent.dev/settings/projects)
4. **Add to your .env file**:

```bash
VOLTAGENT_PUBLIC_KEY=pk_your_public_key_here
VOLTAGENT_SECRET_KEY=sk_your_secret_key_here
```

### Step 2: Create Your First Prompt

![VoltOps Prompt Management](https://cdn.voltagent.dev/docs/create-prompt-demo.gif)

Let's create a customer support prompt step by step:

1. **Navigate to Prompts**: Go to [`https://console.voltagent.dev/prompts`](https://console.voltagent.dev/prompts)
2. **Click "Create Prompt"** button in the top right
3. **Fill in the prompt details**:
   - **Name**: `customer-support-prompt`
   - **Description**: `Customer support agent prompt for handling user inquiries`
   - **Type**: Select `Text` (we'll explore chat type later)
   - **Content**:

   ```
   You are a helpful customer support agent for {{companyName}}.

   Your role is to assist customers with their questions and concerns in a {{tone}} manner.

   Current support level: {{supportLevel}}

   Guidelines:
   - Always be polite and professional
   - If you cannot help, escalate to human support
   - Use the company name when appropriate
   ```

4. **Add template variables** (these will be auto-detected):
   - `companyName`
   - `tone`
   - `supportLevel`
5. **Set initial labels**: Add `development` label
6. **Click "Create Prompt"**

<!-- GIF: Creating a prompt in the console -->

### Step 3: Use the Prompt in Your Code

![VoltOps Prompt Playground Demo](https://cdn.voltagent.dev/docs/voltops-prompt-playground.gif)

Now let's integrate this prompt into your VoltAgent application:

**Setup VoltOps Client:**

```typescript
import { Agent, VoltAgent, VoltOpsClient } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
  prompts: true,
  promptCache: {
    enabled: true,
    ttl: 300, // 5 minutes
  },
});

const supportAgent = new Agent({
  name: "SupportAgent",
  model: openai("gpt-4o-mini"),
  instructions: async ({ prompts }) => {
    return await prompts.getPrompt({
      promptName: "customer-support-prompt",
      variables: {
        companyName: "VoltAgent Corp",
        tone: "friendly and professional",
        supportLevel: "premium",
      },
    });
  },
});

// Initialize VoltAgent with agents and VoltOps client
const voltAgent = new VoltAgent({
  agents: {
    supportAgent,
  },
  voltOpsClient: voltOpsClient,
});

// Test your agent
const response = await supportAgent.generateText("I'm having trouble with my order");
console.log(response.text);
```

:::tip Alternative: Direct VoltOpsClient on Agent
You can also pass the VoltOpsClient directly to individual agents:

```typescript
const supportAgent = new Agent({
  name: "SupportAgent",
  model: openai("gpt-4o-mini"),
  instructions: async ({ prompts }) => {
    return await prompts.getPrompt({
      promptName: "customer-support-prompt",
      variables: {
        companyName: "VoltAgent Corp",
        tone: "friendly and professional",
        supportLevel: "premium",
      },
    });
  },
  voltOpsClient: voltOpsClient, // Direct client assignment
});
```

This approach is useful when you have agents with different VoltOps configurations or when you need fine-grained control over client settings per agent.
:::

**💡 Tip**: You can also find complete usage examples in the prompt's **Usage tab** in the console interface, with copy-ready code snippets for different scenarios.

:::tip Direct VoltOpsClient Access
You can also access prompts directly from the VoltOpsClient outside of agent instructions, which is useful for testing and debugging:

```typescript
// Direct access for testing or utility functions
const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
});

// Get prompt directly
const promptContent = await voltOpsClient.prompts.getPrompt({
  promptName: "customer-support-prompt",
  variables: {
    companyName: "VoltAgent Corp",
    tone: "friendly and professional",
    supportLevel: "premium",
  },
});

console.log("Prompt content:", promptContent);
```

This approach is perfect for:

- Testing prompts independently
- Building prompt preview tools
- Dynamic prompt selection logic
- Utility functions that need prompt access
  :::

### Step 4: Create a New Version

![VoltOps Prompt Versioning](https://cdn.voltagent.dev/docs/create-new-version-prompt.gif)

As your application evolves, you'll want to improve your prompts. Let's create a new version:

1. **Go to your prompt detail page**
2. **Click "New Version"** button
3. **Modify the prompt content**:

   ```
   You are an expert customer support agent for {{companyName}}.

   Your mission is to provide exceptional service and resolve customer issues efficiently.

   Support tier: {{supportLevel}}
   Communication style: {{tone}}

   Enhanced guidelines:
   - Always acknowledge the customer's concern first
   - Provide clear, step-by-step solutions
   - Offer alternative solutions when possible
   - Follow up to ensure satisfaction
   - Escalate complex technical issues to our technical team

   Remember: Every interaction is an opportunity to create a loyal customer.
   ```

4. **Add a commit message**: "Enhanced support guidelines and improved structure"
5. **Click "Create Version"**

<!-- GIF: Creating a new version -->

### Step 5: Test with Cache Behavior

Now let's test our updated prompt:

```typescript
// Run your agent again
const response = await supportAgent.generateText("I'm having trouble with my order");
```

**You might notice the old prompt is still being used!** This is because of caching.

### Understanding Cache Behavior

VoltOps uses caching to reduce latency and improve performance. There are two levels of cache configuration:

**1. Global VoltOps Client Cache:**

```typescript
const voltOpsClient = new VoltOpsClient({
  // ... other options
  promptCache: {
    enabled: true,
    ttl: 300, // 5 minutes - cached prompts expire after this time
    maxSize: 100, // Maximum number of prompts to cache
  },
});
```

**2. Per-Prompt Cache Override:**

```typescript
instructions: async ({ prompts }) => {
  return await prompts.getPrompt({
    promptName: "customer-support-prompt",
    promptCache: {
      enabled: false, // Disable cache for this specific prompt
    },
    variables: {
      companyName: "VoltAgent Corp",
      tone: "friendly and professional",
      supportLevel: "premium",
    },
  });
};
```

**To test your new version immediately:**

```typescript
// Option 1: Disable cache temporarily
promptCache: {
  enabled: false;
}

// Option 2: Clear cache and test
voltOpsClient.prompts.clearCache();

// Option 3: Wait for TTL to expire (5 minutes by default)
```

### Step 6: Using Labels for Environment Management

![Promote to Production](https://cdn.voltagent.dev/docs/prompt-promoting.gif)

Labels help you manage different versions across environments. Let's promote your new version to production:

1. **Go to your prompt detail page**
2. **Find version 2** in the version history sidebar
3. **Click the "⋯" menu** next to the version
4. **Select "Promote to Production"**
5. **Confirm the promotion**

Now you can target specific environments in your code:

**Development Environment:**

```typescript
instructions: async ({ prompts }) => {
  return await prompts.getPrompt({
    promptName: "customer-support-prompt",
    label: "development", // Uses development version
    variables: {
      /* ... */
    },
  });
};
```

**Production Environment:**

```typescript
instructions: async ({ prompts }) => {
  return await prompts.getPrompt({
    promptName: "customer-support-prompt",
    label: "production", // Uses production version
    variables: {
      /* ... */
    },
  });
};
```

**Environment-based Selection:**

```typescript
instructions: async ({ prompts }) => {
  const label = process.env.NODE_ENV === "production" ? "production" : "development";

  return await prompts.getPrompt({
    promptName: "customer-support-prompt",
    label: label,
    variables: {
      /* ... */
    },
  });
};
```

<!-- GIF: Promoting to production label -->

### Step 7: Chat Type Prompts

For more complex conversational agents, you can use chat-type prompts that define multiple message roles:

**Creating a Chat Prompt:**

1. **Click "Create Prompt"**
2. **Select "Chat" type**
3. **Add multiple messages**:
   ```json
   [
     {
       "role": "system",
       "content": "You are {{agentRole}} for {{companyName}}. Always maintain a {{tone}} tone."
     },
     {
       "role": "user",
       "content": "Hello, I need help with my account."
     },
     {
       "role": "assistant",
       "content": "Hello! I'd be happy to help you with your account. Could you please provide more details about the specific issue you're experiencing?"
     }
   ]
   ```

**Using Chat Prompts:**

```typescript
const chatAgent = new Agent({
  name: "ChatSupportAgent",
  model: openai("gpt-4o-mini"),
  instructions: async ({ prompts }) => {
    return await prompts.getPrompt({
      promptName: "chat-support-prompt",
      variables: {
        agentRole: "customer support specialist",
        companyName: "VoltAgent Corp",
        tone: "friendly and professional",
      },
    });
  },
  voltOpsClient: voltOpsClient,
});
```

Chat prompts are perfect for:

- Multi-turn conversations
- Setting conversation context
- Providing example interactions
- Fine-tuning response patterns

### What it is

Enterprise-grade prompt management platform that separates prompt content from your application code. Think of it as "GitHub for prompts" with built-in analytics, team collaboration, and deployment pipelines.

**Real-world examples**:

- **Large development teams**: Product managers can edit prompts without touching code
- **Enterprise applications**: Compliance teams can review prompt changes before production
- **SaaS platforms**: Different prompt versions for different customer tiers managed centrally
- **AI-first companies**: Data scientists can optimize prompts based on performance analytics

### When to use

**✅ Essential for:**

- **Team collaboration**: Non-technical stakeholders need to edit prompts
- **Production environments**: You need audit trails, rollback capabilities, and change approval workflows
- **Multiple environments**: Different prompt versions for dev/staging/production
- **Performance optimization**: You need analytics on prompt effectiveness and costs
- **Compliance requirements**: Audit trails and approval processes for prompt changes
- **Scale operations**: Managing 10+ different prompts across multiple agents

### Pros & Cons

| Pros                               | Cons                |
| ---------------------------------- | ------------------- |
| Complete version control           | External dependency |
| Team collaboration features        | Requires setup      |
| Environment-specific labels        | Network requests    |
| Template variables with validation | Learning curve      |
| Built-in analytics and monitoring  |                     |
| Performance caching                |                     |
| Chat and text prompt support       |                     |

## 5. Best Practices

### Prompt Versioning Strategies

**Follow semantic versioning principles:**

```typescript
// Bad: Vague commit messages
"updated prompt";
"fixed issues";

// Good: Descriptive commit messages
"Add persona consistency guidelines for customer support";
"Reduce hallucination by adding explicit knowledge boundaries";
"Optimize for 20% faster response times based on analytics";
```

**Environment promotion workflow:**

```typescript
// 1. Develop and test in development
const devPrompt = await prompts.getPrompt({
  promptName: "support-agent",
  label: "development",
});

// 2. Promote to staging for integration testing
// (Done via VoltOps console)

// 3. After approval, promote to production
const prodPrompt = await prompts.getPrompt({
  promptName: "support-agent",
  label: "production",
});
```

### Error Handling & Resilience

**Always implement fallback strategies:**

```typescript
instructions: async ({ prompts }) => {
  try {
    return await prompts.getPrompt({
      promptName: "primary-prompt",
      timeout: 5000, // 5 second timeout
    });
  } catch (error) {
    console.error("Prompt fetch failed, using fallback:", error);

    // Fallback to static prompt
    return "You are a helpful assistant. Please help the user with their question.";
  }
};
```

### Performance Optimization

**Strategic caching configuration:**

```typescript
// High-frequency prompts: Short TTL
const frequentPrompt = await prompts.getPrompt({
  promptName: "chat-greeting",
  promptCache: { ttl: 60, enabled: true }, // 1 minute
});

// Stable prompts: Long TTL
const stablePrompt = await prompts.getPrompt({
  promptName: "system-instructions",
  promptCache: { ttl: 3600, enabled: true }, // 1 hour
});

// Dynamic prompts: No cache
const dynamicPrompt = await prompts.getPrompt({
  promptName: "personalized-prompt",
  promptCache: { enabled: false },
  variables: { userId: dynamicUserId },
});
```

**Preload critical prompts:**

```typescript
// Preload during application startup
const criticalPrompts = ["welcome-message", "error-handler", "fallback-response"];

await Promise.all(criticalPrompts.map((name) => prompts.getPrompt({ promptName: name })));
```

### Security Best Practices

**Input sanitization for template variables:**

```typescript
instructions: async ({ prompts, context }) => {
  // Sanitize user input
  const sanitizedUserName =
    context
      .get("userName")
      ?.replace(/[<>]/g, "") // Remove potential HTML
      ?.substring(0, 50) || "Guest"; // Limit length

  return await prompts.getPrompt({
    promptName: "personalized-greeting",
    variables: {
      userName: sanitizedUserName,
      // Never pass raw user input directly
    },
  });
};
```

## 6. Troubleshooting

### Common Issues

**Prompt not found error:**

```typescript
// Problem: Prompt name doesn't exist
Error: Prompt 'weather-prompt' not found

// Solution: Check prompt name spelling and ensure it exists in VoltOps
instructions: async ({ prompts }) => {
  try {
    return await prompts.getPrompt({ promptName: "weather-prompt" });
  } catch (error) {
    console.error("Prompt fetch failed:", error);
    return "Fallback instructions here";
  }
}
```

**Template variable errors:**

```typescript
// Problem: Missing required variables
Template error: Variable 'userName' not found

// Solution: Provide all required variables
return await prompts.getPrompt({
  promptName: "greeting-prompt",
  variables: {
    userName: context.get('userName') || 'Guest', // Provide default
    currentTime: new Date().toISOString()
  }
});
```

**Cache issues:**

```typescript
// Problem: Stale prompts due to caching
// Solution: Clear cache or adjust TTL
voltOpsClient.clearCache(); // Clear all cached prompts

// Or disable caching temporarily
return await prompts.getPrompt({
  promptName: "urgent-prompt",
  promptCache: { enabled: false },
});
```

**Authentication errors:**

```typescript
// Problem: Invalid API keys
Error: Authentication failed

// Solution: Verify environment variables
console.log("Public Key:", process.env.VOLTAGENT_PUBLIC_KEY?.substring(0, 8) + "...");
console.log("Secret Key:", process.env.VOLTAGENT_SECRET_KEY ? "Set" : "Missing");
```

### Debug Tips

**Test prompt fetching independently:**

```typescript
// Test VoltOps connection outside of agent
const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
});

const promptManager = voltOpsClient.prompts;

try {
  const prompt = await promptManager.getPrompt({
    promptName: "test-prompt",
  });
  console.log("Prompt fetch successful:", prompt);
} catch (error) {
  console.error("Prompt fetch failed:", error);
}
```

## 7. Choosing the Right Approach

### At a Glance Comparison

| Feature                   | Static Instructions | Dynamic Instructions | VoltOps Management  |
| ------------------------- | ------------------- | -------------------- | ------------------- |
| **Setup Time**            | 0 minutes           | 5 minutes            | 15 minutes          |
| **Runtime Performance**   | Fastest             | Fast                 | Good (with caching) |
| **Context Awareness**     | ❌                  | ✅                   | ✅                  |
| **Team Collaboration**    | ❌                  | Limited              | ✅                  |
| **Version Control**       | Code-based          | Code-based           | Built-in            |
| **Non-technical Editing** | ❌                  | ❌                   | ✅                  |
| **Analytics**             | Manual              | Manual               | Built-in            |
| **A/B Testing**           | Manual              | Code-based           | Built-in            |
| **Offline Support**       | ✅                  | ✅                   | ❌                  |
| **Cost**                  | Free                | Free                 | Paid service        |

### Real-World Scenarios

**Scenario 1: Solo Developer Building a Personal Tool**

```typescript
// Use Static Instructions
const agent = new Agent({
  instructions: "You are a helpful code reviewer. Focus on security and performance.",
  // ... other options
});
```

**Why**: No team collaboration needed, behavior is consistent, setup is instant.

**Scenario 2: SaaS Platform with Different User Tiers**

```typescript
// Use Dynamic Instructions
const agent = new Agent({
  instructions: async ({ context }) => {
    const tier = context.get("tier");
    return tier === "premium"
      ? "You are a dedicated premium support agent with deep technical expertise."
      : "You are a helpful support agent providing efficient solutions.";
  },
});
```

**Why**: Behavior changes based on user context, but you don't need external prompt management.

**Scenario 3: Enterprise Team with Product Managers**

```typescript
// Use VoltOps Management
const agent = new Agent({
  instructions: async ({ prompts }) => {
    return await prompts.getPrompt({
      promptName: "customer-support-agent",
      label: process.env.NODE_ENV === "production" ? "production" : "development",
    });
  },
  voltOpsClient: voltOpsClient,
});
```

**Why**: Non-technical team members need to edit prompts, you need approval workflows, and analytics are important.

### Quick Start Recommendations

1. **Just starting with VoltAgent?** → Start with Static Instructions
2. **Need user-specific behavior?** → Use Dynamic Instructions
3. **Working with a team?** → Evaluate VoltOps Management
4. **Building for production?** → Plan migration path to VoltOps

Remember: You can always start simple and migrate to more sophisticated approaches as your needs grow. The key is choosing the right level of complexity for your current requirements.
