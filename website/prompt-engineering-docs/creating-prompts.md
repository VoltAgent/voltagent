---
title: Creating Prompts
---

# Creating Prompts

Learn how to create, configure, and manage prompts in VoltOps.

## From the Dashboard

1. Navigate to **Prompts** in the VoltOps console
2. Click **Create Prompt**
3. Fill in the prompt details:
   - Name (lowercase, hyphens allowed)
   - Description (optional)
   - Type: Text or Chat
   - Content
4. Click **Save**

## Prompt Types

### Text Prompts

Simple single-message prompts for straightforward instructions:

```
You are a helpful customer support agent for {{companyName}}.
Your role is to assist customers with their inquiries about {{topic}}.
Always be polite and professional.
```

### Chat Prompts

Multi-turn conversation templates with role-based messages:

```
SYSTEM: You are an expert {{role}} assistant.

USER: I need help with {{topic}}.

ASSISTANT: I'd be happy to help you with {{topic}}. Let me guide you through the process.
```

## Template Variables

Use double curly braces to define dynamic variables in your prompts:

```
Hello {{userName}}, welcome to {{companyName}}!
Your account tier is {{tier}} with {{remainingCredits}} credits remaining.
```

Variables are replaced at runtime when the prompt is fetched. The dashboard shows a **Preview** mode where you can test variable substitution before deploying.

## Version Management

### Creating New Versions

1. Open the prompt detail page
2. Click **New Version**
3. Edit the content
4. Add a commit message describing changes
5. Click **Save**

### Promoting Versions

Assign labels to control which version serves each environment:

1. In the version list, click the menu icon (three dots)
2. Select **Promote to** and choose a label
3. Or add a custom label in the Custom Label field

When you promote a version to a label, that label is automatically removed from any other version. Each label points to exactly one version.

### Comparing Versions

Click any version while another is selected to open the **Diff View**:

- Side-by-side comparison
- Word-level highlighting of changes
- Added text shown in green
- Removed text shown in red

### Duplicating Versions

Create a new version based on an existing one:

1. Click the menu icon on any version
2. Select **Duplicate**
3. Edit the duplicated content
4. Save as a new version

## Configuration Options

Prompts can include optional configuration stored as JSON:

```json
{
  "temperature": 0.7,
  "maxTokens": 1000,
  "stopSequences": ["END"],
  "metadata": {
    "author": "team-ai",
    "reviewed": true
  }
}
```

Access configuration in your agent:

```typescript
const agent = new Agent({
  name: "ConfiguredAgent",
  model: openai("gpt-4o-mini"),
  instructions: async ({ prompts }) => {
    const result = await prompts.getPrompt({
      promptName: "my-prompt",
    });

    // Access both content and config
    console.log(result.config.temperature);
    return result.content;
  },
});
```

## Archiving Prompts

Archive prompts you no longer need:

1. Archived prompts cannot be modified
2. No new versions can be created
3. Existing versions remain accessible for historical reference
4. Use the **Restore** button to reactivate an archived prompt
