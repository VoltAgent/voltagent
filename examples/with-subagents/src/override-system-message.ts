import { Agent, VoltAgent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Create simple subagents
const writerAgent = new Agent({
  name: "Writer",
  instructions: "Creates content based on user requests",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

const editorAgent = new Agent({
  name: "Editor",
  instructions: "Reviews and improves content",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// ✅ Simple system message override example
export const systemMessageOverrideAgent = new Agent({
  name: "CustomSupervisor",
  instructions: "This will be completely ignored", // This gets ignored
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [writerAgent, editorAgent],

  // ✅ Complete system message override
  supervisorConfig: {
    systemMessage: `
You are a friendly content manager named "ContentBot".

Your specialists:
- Writer: Creates content
- Editor: Reviews content

Instructions:
1. Always greet users warmly
2. Use delegate_task to assign work
3. Provide helpful responses
4. Thank users at the end

Example workflow:
1. User asks for content → delegate to Writer
2. Writer creates content → delegate to Editor for review
3. Editor reviews → provide final response
    `.trim(),
    includeAgentsMemory: true,
  },
});

// ✅ No memory example
export const noMemoryOverrideAgent = new Agent({
  name: "NoMemorySupervisor",
  instructions: "This will be ignored too",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [writerAgent],

  // ✅ Override with no memory
  supervisorConfig: {
    systemMessage: `
You are a simple task coordinator.

Available agent: Writer (creates content)

Keep responses short and direct.
Use delegate_task when needed.
    `.trim(),
    includeAgentsMemory: false, // No previous interactions
  },
});
