export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  path: string;
  completed?: boolean;
  files: Record<string, { code: string; active?: boolean; hidden?: boolean; readOnly?: boolean }>;
  dependencies?: Record<string, string>;
}

export const tutorialSteps: TutorialStep[] = [
  {
    id: "introduction",
    title: "Introduction",
    description: "Learn what VoltAgent is and see it in action",
    path: "/tutorial/introduction",
    files: {
      "src/index.js": {
        code: `// Welcome to VoltAgent Interactive Tutorial!
// 
// VoltAgent is a powerful TypeScript framework for building AI agents.
// In this tutorial, you'll learn step by step how to:
//
// 1. Create your first AI agent
// 2. Add tools and capabilities  
// 3. Implement memory and conversations
// 4. Build advanced features like sub-agents and RAG
//
// Let's start by exploring what VoltAgent can do!

console.log("🚀 Welcome to VoltAgent!");
console.log("👋 Ready to build your first AI agent?");

// Click "Next: Basic Agent" to get started!`,
        active: true,
      },
    },
  },
  {
    id: "basic-agent",
    title: "Basic Agent",
    description: "Create your first VoltAgent",
    path: "/tutorial/basic-agent",
    files: {
      "src/index.js": {
        code: `import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

// Create your first AI agent
const agent = new Agent({
  name: "Tutorial Agent", 
  instructions: "You are a helpful assistant that explains VoltAgent concepts clearly.",
  model: openai("gpt-4o-mini"),
});

// Initialize VoltAgent
new VoltAgent({
  agents: {
    tutorialAgent: agent,
  },
  server: honoServer(),
});

// Generate a response
async function askAgent() {
  try {
    const response = await agent.generateText("Hello! Can you explain what VoltAgent is?");
    console.log("🤖 Agent Response:");
    console.log(response.text);
  } catch (error) {
    console.error("Error:", error.message);
    console.log("💡 Tip: Make sure to add your OpenAI API key in the .env file");
  }
}

// Try it out!
askAgent();`,
        active: true,
      },
    },
  },
  {
    id: "adding-tools",
    title: "Adding Tools",
    description: "Give your agent superpowers with tools",
    path: "/tutorial/adding-tools",
    files: {
      "src/index.js": {
        code: `import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

// Create a weather tool
const weatherTool = {
  name: "get_weather",
  description: "Get current weather for a city",
  parameters: z.object({
    city: z.string().describe("The city name"),
    units: z.enum(["celsius", "fahrenheit"]).default("celsius")
  }),
  execute: async ({ city, units }) => {
    // Simulate weather API call
    const temp = units === "celsius" ? "22°C" : "72°F";
    return {
      city,
      temperature: temp,
      condition: "Sunny",
      humidity: "65%"
    };
  }
};

// Create agent with tools
const agent = new Agent({
  name: "Weather Agent",
  instructions: "You are a helpful weather assistant. Use the weather tool to provide accurate information.",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
});

new VoltAgent({
  agents: { weatherAgent: agent },
  server: honoServer(),
});

// Test the agent with tools
async function testWithTools() {
  try {
    const response = await agent.generateText(
      "What's the weather like in Paris? Please use Celsius."
    );
    console.log("🌤️ Weather Response:");
    console.log(response.text);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testWithTools();`,
        active: true,
      },
    },
  },
  {
    id: "memory-conversations",
    title: "Memory & Conversations",
    description: "Enable your agent to remember conversations",
    path: "/tutorial/memory-conversations",
    files: {
      "src/index.js": {
        code: `import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, Memory } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

// Create agent with memory
const agent = new Agent({
  name: "Memory Agent",
  instructions: "You are a helpful assistant with excellent memory. Remember user preferences and past conversations.",
  model: openai("gpt-4o-mini"),
  memory: new Memory(),
});

new VoltAgent({
  agents: { memoryAgent: agent },
  server: honoServer(),
});

// Simulate a conversation with memory
async function conversationDemo() {
  try {
    console.log("🧠 Starting conversation with memory...");
    
    // First message
    const response1 = await agent.generateText(
      "Hi! My name is Alex and I love JavaScript programming.",
      { userId: "user123", conversationId: "conv1" }
    );
    console.log("Message 1:", response1.text);
    
    // Second message - agent should remember
    const response2 = await agent.generateText(
      "What's my name and what do I like?",
      { userId: "user123", conversationId: "conv1" }
    );
    console.log("Message 2:", response2.text);
    
    // Third message - testing memory
    const response3 = await agent.generateText(
      "Can you suggest a JavaScript framework for me?",
      { userId: "user123", conversationId: "conv1" }
    );
    console.log("Message 3:", response3.text);
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

conversationDemo();`,
        active: true,
      },
    },
  },
  {
    id: "advanced-features",
    title: "Advanced Features",
    description: "Explore sub-agents, RAG, and more",
    path: "/tutorial/advanced-features",
    files: {
      "src/index.js": {
        code: `import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

// Create a specialized research sub-agent
const researchAgent = new Agent({
  name: "Research Agent",
  instructions: "You are a research specialist. Provide detailed, well-researched information on any topic.",
  model: openai("gpt-4o-mini"),
});

// Create a writing sub-agent  
const writerAgent = new Agent({
  name: "Writer Agent",
  instructions: "You are a skilled writer. Create engaging, well-structured content based on research.",
  model: openai("gpt-4o-mini"),
});

// Create supervisor agent with sub-agents
const supervisorAgent = new Agent({
  name: "Supervisor Agent",
  instructions: "You coordinate between research and writing agents to create comprehensive content.",
  model: openai("gpt-4o-mini"),
  subAgents: [researchAgent, writerAgent],
});

new VoltAgent({
  agents: {
    supervisor: supervisorAgent,
    researcher: researchAgent, 
    writer: writerAgent,
  },
  server: honoServer(),
});

// Demonstrate sub-agent coordination
async function advancedDemo() {
  try {
    console.log("🎯 Advanced VoltAgent Features Demo");
    
    const response = await supervisorAgent.generateText(
      "I need a comprehensive article about the benefits of TypeScript. First research the topic, then write a well-structured article."
    );
    
    console.log("📝 Coordinated Response:");
    console.log(response.text);
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

advancedDemo();`,
        active: true,
      },
    },
  },
];

export const getTutorialStep = (stepId: string): TutorialStep | undefined => {
  return tutorialSteps.find((step) => step.id === stepId);
};

export const getTutorialStepsForNavigation = (currentStepId: string) => {
  return tutorialSteps.map((step) => ({
    ...step,
    completed: false, // This could be tracked in localStorage or state
    current: step.id === currentStepId,
  }));
};
