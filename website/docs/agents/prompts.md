# Agent Instructions

## Overview

VoltAgent supports three approaches for defining agent instructions. Each approach addresses different requirements around flexibility, team collaboration, and deployment workflows.

### The Three Approaches

| Approach                 | Definition                    | Context Access | Team Workflow    |
| ------------------------ | ----------------------------- | -------------- | ---------------- |
| **Static Instructions**  | Hardcoded string              | No             | Code-based       |
| **Dynamic Instructions** | Function with runtime context | Yes            | Code-based       |
| **VoltOps Management**   | Externally managed prompts    | Yes            | Platform-managed |

## Static Instructions

Static instructions are literal strings assigned to the `instructions` property.

```typescript
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "SupportAgent",
  model: openai("gpt-4o-mini"),
  instructions: "You are a customer support agent. Help users with their questions.",
});
```

**Type signature:**

```typescript
instructions: string;
```

### When to Use

Use static instructions when:

- Agent behavior is consistent across all interactions
- No runtime context is needed
- Instructions rarely change
- Team members edit prompts through code reviews

Avoid when:

- Different users need different behavior
- Instructions depend on runtime data (user tier, time, location)
- Non-technical team members need to edit prompts
- You need prompt versioning outside of code commits

## Dynamic Instructions

Dynamic instructions are functions that receive runtime context and return instructions.

### Returning Strings

Functions can return a plain string based on context:

```typescript
const agent = new Agent({
  name: "SupportAgent",
  model: openai("gpt-4o-mini"),
  instructions: async ({ context }) => {
    const userTier = context.get("userTier") || "basic";

    if (userTier === "premium") {
      return "You are a premium customer support agent. Provide detailed explanations and prioritize this customer's requests.";
    }
    return "You are a customer support agent. Provide helpful but concise answers.";
  },
});
```

**Using with context:**

```typescript
const premiumContext = new Map();
premiumContext.set("userTier", "premium");

const response = await agent.generateText("I need help", {
  context: premiumContext,
});
```

### Returning PromptContent Objects

Functions can also return `PromptContent` objects for text or chat-based instructions.

**Text type:**

```typescript
const agent = new Agent({
  name: "SupportAgent",
  model: openai("gpt-4o-mini"),
  instructions: async ({ context }) => {
    return {
      type: "text",
      text: "You are a customer support agent.",
    };
  },
});
```

**Chat type with multiple messages:**

```typescript
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "ChatAgent",
  model: openai("gpt-4o-mini"),
  instructions: async () => {
    return {
      type: "chat",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
        {
          role: "user",
          content: "Hello!",
        },
        {
          role: "assistant",
          content: "Hi! How can I help you today?",
        },
      ],
    };
  },
});
```

**Chat type with provider-specific options:**

```typescript
import { Agent } from "@voltagent/core";
import { anthropic } from "@ai-sdk/anthropic";

const agent = new Agent({
  name: "CachedAgent",
  model: anthropic("claude-3-7-sonnet-20250219"),
  instructions: async () => {
    return {
      type: "chat",
      messages: [
        {
          role: "system",
          content: "Long system prompt that should be cached...",
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

**Type signature:**

```typescript
instructions: (options: DynamicValueOptions) => Promise<string | PromptContent>;

interface DynamicValueOptions {
  context: Map<string | symbol, unknown>;
  prompts: PromptHelper;
}

interface PromptContent {
  type: "text" | "chat";
  text?: string;
  messages?: ChatMessage[];
}
```

### When to Use

Use dynamic instructions when:

- Agent behavior depends on user properties (tier, role, preferences)
- Instructions need runtime data (time, location, session state)
- Different tenants require different behavior
- Conditional logic determines instruction content

Avoid when:

- Multiple non-technical stakeholders need to edit prompts
- You need prompt version history outside of code
- Collaborative prompt editing is required
- Prompts should update without deploying code

## VoltOps Prompt Management

VoltOps separates prompt content from application code. Prompts are created and versioned in the VoltOps platform, then fetched at runtime.

For complete documentation on VoltOps Prompt Management, see:

- [Prompt Management Overview](/prompt-engineering-docs/) - Creating, versioning, labels, and managing prompts
- [Usage Guide](/prompt-engineering-docs/usage/) - Integration with agents, caching, variables, and error handling

### Quick Example

```typescript
import { Agent, VoltAgent, VoltOpsClient } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

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
      label: "production",
      variables: { companyName: "VoltAgent Corp" },
    });
  },
});

new VoltAgent({
  agents: { agent },
  voltOpsClient: voltOpsClient,
});
```

### When to Use

Use VoltOps when:

- Non-technical team members edit prompts
- Audit trails and approval workflows are required
- Multiple environments need different prompt versions
- Prompt analytics and monitoring are needed

Avoid when:

- External dependencies are not acceptable
- Offline operation is required

## Comparison

| Feature                   | Static      | Dynamic     | VoltOps            |
| ------------------------- | ----------- | ----------- | ------------------ |
| **Type**                  | String      | Function    | External platform  |
| **Context Access**        | No          | Yes         | Yes (via function) |
| **Runtime Flexibility**   | None        | Full        | Full               |
| **Team Collaboration**    | Code review | Code review | Platform UI        |
| **Version Control**       | Git         | Git         | VoltOps + Git      |
| **Non-technical Editing** | No          | No          | Yes                |
| **Analytics**             | No          | No          | Yes                |
| **Offline Support**       | Yes         | Yes         | No                 |
| **External Dependency**   | No          | No          | Yes                |

## Examples

**Static (solo developer, consistent behavior):**

```typescript
const agent = new Agent({
  instructions: "You are a code reviewer. Focus on security and performance.",
  model: openai("gpt-4o-mini"),
});
```

**Dynamic (user-specific behavior):**

```typescript
const agent = new Agent({
  instructions: async ({ context }) => {
    const tier = context.get("tier");
    return tier === "premium"
      ? "You are a premium support agent with deep technical expertise."
      : "You are a support agent providing efficient solutions.";
  },
  model: openai("gpt-4o-mini"),
});
```

**VoltOps (team collaboration, versioning):**

```typescript
const agent = new Agent({
  instructions: async ({ prompts }) => {
    return await prompts.getPrompt({
      promptName: "customer-support-agent",
      label: process.env.NODE_ENV === "production" ? "production" : "development",
    });
  },
  model: openai("gpt-4o-mini"),
  voltOpsClient: voltOpsClient,
});
```
