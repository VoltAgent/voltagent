---
title: Tags
---

import TagExplorer from '@site/src/components/docs-widgets/TagExplorer';

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
