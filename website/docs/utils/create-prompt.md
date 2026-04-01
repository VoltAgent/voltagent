---
title: Create a Prompt
---

# `createPrompt`

The `createPrompt` utility provides a type-safe and flexible way to manage and generate dynamic prompt strings. It allows you to define templates with placeholders (`{{variableName}}`) and inject variables at runtime.

It achieves type safety by automatically inferring variable names from the template string itself. This enables TypeScript to verify that all necessary variables are provided when creating or calling the prompt function, preventing potential runtime errors caused by missing or misspelled variables.

## Key Concepts

### Templates

Prompts are defined using template strings. Placeholders for dynamic content are specified using double curly braces: `{{variableName}}`.

```typescript
const template = "You are a helpful assistant that {{role}}. Task: {{task}}";
```

### Variables

Variables provide the actual content for the placeholders. The `createPrompt` function requires you to provide default values for all variables defined in the template. You can override these defaults later when calling the generated prompt function.

- **Default Variables:** Defined when creating the prompt function. **Required** for all placeholders in the template.
- **Custom Variables:** Provided when calling the generated function to override default values.

Custom variables always take precedence over default variables. If a placeholder doesn't have a corresponding variable in either the defaults or customs, it's replaced with an empty string.

## Usage

### Importing

```typescript
import { createPrompt, PromptTemplate, PromptCreator } from "@voltagent/core";
// Other helper types like TemplateVariables, ExtractVariableNames, AllowedVariableValue are also exported.
```

### Basic Example

Define a template with default variables.

```typescript
import { createPrompt, Agent } from "@voltagent/core";

// Define the prompt template and default variables
const basicPrompt = createPrompt({
  template: `You are a helpful assistant that {{role}}.
Task: {{task}}`,
  variables: { role: "simplifies complex topics", task: "summarize text" },
});

// Generate prompt using only default variables
const prompt1 = basicPrompt();
console.log(prompt1);
/*
Output:
You are a helpful assistant that simplifies complex topics.
Task: summarize text
*/

const agent = new Agent({
  name: "Basic Assistant",
  // Use the generated prompt in the instructions field
  // highlight-next-line
  instructions: prompt1,
  // VoltAgent integrates directly with ai-sdk - just provide a model
  model: "openai/gpt-4o-mini",
});
```

### Overriding Defaults

Provide custom variables when calling the generated function.

```typescript
// Generate prompt with a custom 'task'
const prompt2 = basicPrompt({ task: "Explain quantum computing to a 10-year-old" });
console.log(prompt2);
/*
Output:
You are a helpful assistant that simplifies complex topics.
Task: Explain quantum computing to a 10-year-old
*/

// Override both 'role' and 'task'
const prompt3 = basicPrompt({
  role: "translates languages",
  task: "Translate 'hello' to French",
});
console.log(prompt3);
/*
Output:
You are a helpful assistant that translates languages.
Task: Translate 'hello' to French
*/
```

### More Complex Example (Agent Prompt)

`createPrompt` is useful for structuring complex prompts, like those for AI agents.

```typescript
import { createPrompt } from "@voltagent/core";

const agentPrompt = createPrompt({
  template: `You are an AI agent with the following capabilities: {{capabilities}}.
Your current goal is: {{goal}}
Available context: {{context}}
Task: {{task}}`,
  variables: {
    capabilities: "web search, code execution",
    goal: "Answer user queries",
    context: "No specific context yet",
    task: "", // Default task is empty
  },
});

const agentTaskPrompt = agentPrompt({
  goal: "Help the user solve a programming problem",
  context: "User is working with Node.js and Express",
  task: "Debug an error in a REST API endpoint",
});

console.log(agentTaskPrompt);
/*
Output:
You are an AI agent with the following capabilities: web search, code execution.
Your current goal is: Help the user solve a programming problem
Available context: User is working with Node.js and Express
Task: Debug an error in a REST API endpoint
*/
```

## API Reference

### `createPrompt<T extends string>(options: PromptTemplate<T>): PromptCreator<T>`

Creates a type-safe, reusable prompt generation function based on a template string literal `T`.

- **`T`**: A string literal type representing the template. Variable names are inferred from this type.
- \*\*`options`
