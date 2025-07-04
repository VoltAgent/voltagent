---
"@voltagent/core": patch
---

feat: add supervisorConfig API for customizing supervisor agent behavior

**SupervisorConfig API enables complete control over supervisor agent system messages and behavior** when working with SubAgents, allowing users to customize guidelines, override system messages, and control memory inclusion.

## 🎯 What's New

**🚀 SupervisorConfig API:**

```typescript
const supervisor = new Agent({
  name: "Custom Supervisor",
  instructions: "Coordinate specialized tasks",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [writerAgent, editorAgent],

  supervisorConfig: {
    // Complete system message override
    systemMessage: "You are TaskBot. Use delegate_task to assign work.",

    // Add custom rules to default guidelines
    customGuidelines: ["Always verify sources", "Include confidence levels"],

    // Control memory inclusion (default: true)
    includeAgentsMemory: false,
  },
});
```

## 🔧 Configuration Options

- **`systemMessage`**: Complete system message override - replaces default template
- **`customGuidelines`**: Add custom rules to default supervisor guidelines
- **`includeAgentsMemory`**: Control whether previous agent interactions are included
