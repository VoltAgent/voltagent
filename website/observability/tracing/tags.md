---
title: Tags
---

import TagExplorer from '@site/src/components/tags/TagExplorer';

# Tags

Tags allow you to categorize and filter traces for better organization and analysis. Add meaningful labels to your traces to group related activities, track performance by category, and quickly find specific interactions in your dashboard.

## Basic Usage

Add tags as an array of strings when creating traces:

<TagExplorer />

## Tag Usage

### Python SDK

```tsx
async with sdk.trace(
    agentId="content-generator",
    input={"topic": "AI documentation"},
    userId="writer-123",
   //highlight-next-line
    tags=["content", "documentation", "ai", "high-priority"],
    metadata={
        "department": "marketing",
        "deadline": "2024-01-30"
    }
) as trace:
    # Your agent logic here
    pass
```

### Vercel AI SDK

```javascript
const result = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "Write a product description",
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "product-writer",
      userId: "marketing-team",
      //highlight-next-line
      tags: ["marketing", "product", "content", "ecommerce"],
    },
  },
});
```

### VoltAgent Framework

```javascript
const agent = new Agent({
  name: "Code Review Assistant",
  instructions: "Review code for best practices",
  //highlight-next-line
  tags: ["code-review", "development", "quality-assurance", "automated"],
  userId: "dev-123",
});

await agent.run("Review this React component");
```

## Best Practices

<details>
<summary>
Dynamic Tagging
</summary>

Generate tags based on context:

```javascript
const generateTags = (request) => {
  const baseTags = ["support"];

  // Add priority tag
  if (request.priority === "high") baseTags.push("urgent");

  // Add category tag
  baseTags.push(`category:${request.category}`);

  // Add user tier tag
  baseTags.push(`tier:${request.userTier}`);

  return baseTags;
};

const trace = await sdk.trace({
  name: "Support Request",
  agentId: "support-agent",
  //highlight-next-line
  tags: generateTags(request), // Dynamic tags based on request
  // ... other parameters
});
```

</details>

<details>
<summary>
Consistent Naming
</summary>

Use standardized tag conventions across your team:

```javascript
// Good: Consistent kebab-case
tags: ["customer-support", "password-reset", "high-priority"];

// Avoid: Mixed conventions
tags: ["CustomerSupport", "password_reset", "HIGH_PRIORITY"];
```

</details>

<details>
<summary>
Hierarchical Tags
</summary>

Use prefixes for better organization:

```javascript
// Feature categories
tags: ["feature:auth", "feature:payments", "feature:notifications"];

// Priority levels
tags: ["priority:high", "priority:medium", "priority:low"];

// Team ownership
tags: ["team:backend", "team:frontend", "team:devops"];

// Status indicators
tags: ["status:success", "status:error", "status:retry"];
```

</details>

<details>
<summary>
Tag Categories
</summary>

#### Functional Tags

Categorize by feature or purpose:

```javascript
// Customer support scenarios
tags: ["support", "password-reset", "account-issue"];
tags: ["support", "billing", "subscription"];
tags: ["support", "technical-help", "integration"];

// Content creation
tags: ["content", "blog-post", "marketing"];
tags: ["content", "documentation", "technical"];
tags: ["content", "social-media", "campaign"];

// Data processing
tags: ["data", "analysis", "report"];
tags: ["data", "etl", "transformation"];
tags: ["data", "validation", "quality-check"];
```

#### Priority Tags

Track urgency and importance:

```javascript
// Priority levels
tags: ["priority-high", "urgent"];
tags: ["priority-medium", "standard"];
tags: ["priority-low", "background"];

// Business impact
tags: ["business-critical", "revenue-impact"];
tags: ["customer-facing", "external"];
tags: ["internal", "maintenance"];
```

#### Environment Tags

Separate different deployment stages:

```javascript
// Environment identification
tags: ["production", "live"];
tags: ["staging", "testing"];
tags: ["development", "local"];

// Regional tags
tags: ["us-east", "production"];
tags: ["eu-west", "staging"];
tags: ["asia-pacific", "development"];
```

#### User Type Tags

Categorize by user segments:

```javascript
// Customer tiers
tags: ["premium-user", "priority-support"];
tags: ["standard-user", "regular-support"];
tags: ["trial-user", "onboarding"];

// User roles
tags: ["admin-user", "management"];
tags: ["end-user", "customer"];
tags: ["developer", "api-access"];
```

</details>

<details>
<summary>
Common Tag Patterns
</summary>

### Error Tracking

```javascript
// Error categorization
tags: ["error", "timeout", "api-failure"];
tags: ["error", "validation", "user-input"];
tags: ["error", "auth", "token-expired"];
```

### A/B Testing

```javascript
// Experiment tracking
tags: ["experiment:checkout-v2", "variant:control"];
tags: ["experiment:checkout-v2", "variant:treatment"];
tags: ["experiment:pricing", "variant:discount-20"];
```

### Feature Flags

```javascript
// Feature rollout tracking
tags: ["feature:new-dashboard", "rollout:beta"];
tags: ["feature:advanced-search", "rollout:50-percent"];
tags: ["feature:ai-suggestions", "rollout:full"];
```

</details>

Tags transform trace organization from chaos to clarity, enabling powerful filtering, analytics, and team collaboration across your AI workflows.
