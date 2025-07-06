import type React from "react";
import { TutorialLayout } from "../../components/tutorial/TutorialLayout";
import CodeBlock from "@theme/CodeBlock";
import { ColorModeProvider } from "@docusaurus/theme-common/internal";

const memoryCode = `import { Agent, createTool } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { LibSQLStorage } from "@voltagent/libsql";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Initialize storage with LibSQL
const storage = new LibSQLStorage({
    url: "file:memory.db",  // Local SQLite file for development
    // For production: url: "libsql://your-turso-database-url"
    // authToken: "your-auth-token"
});

// Create a note-taking tool
const noteTool = createTool({
    name: "save_note",
    description: "Save important information or notes for the user",
    parameters: z.object({
        title: z.string().describe("Title or topic of the note"),
        content: z.string().describe("The note content to save")
    }),
    execute: async ({ title, content }) => {
        // In a real app, you'd save this to your database
        console.log(\`Saving note: \${title} - \${content}\`);
        return {
            success: true,
            message: \`Note "\${title}" saved successfully\`,
            timestamp: new Date().toISOString()
        };
    }
});

// Create agent with memory storage
const agent = new Agent({
    name: "Memory Assistant",
    instructions: "You are a helpful assistant with memory. Remember what users tell you and reference previous conversations. Use the note tool to save important information users share.",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    storage: storage,  // Add storage for memory
    tools: [noteTool]
});

// Example: Multi-turn conversation with memory
async function demonstrateMemory() {
    const userId = "user123";
    const conversationId = "conv-001";
    
    console.log("=== Conversation 1 ===");
    
    // First interaction
    const response1 = await agent.generateText(
        "Hi! My name is Alex and I'm working on a VoltAgent project.",
        { userId, conversationId }
    );
    console.log("Agent:", response1.text);
    
    // Second interaction - agent should remember the name
    const response2 = await agent.generateText(
        "Can you save a note that I prefer JavaScript over Python?",
        { userId, conversationId }
    );
    console.log("Agent:", response2.text);
    
    // Third interaction - test memory retention
    const response3 = await agent.generateText(
        "What's my name and what programming language do I prefer?",
        { userId, conversationId }
    );
    console.log("Agent:", response3.text);
    
    console.log("\n=== Later Conversation ===");
    
    // Different conversation, same user - should still remember
    const newConversationId = "conv-002";
    const response4 = await agent.generateText(
        "Hello again! Do you remember me?",
        { userId, conversationId: newConversationId }
    );
    console.log("Agent:", response4.text);
}

// Example: Multiple users with separate memory
async function demonstrateMultiUser() {
    console.log("\n=== Multi-User Example ===");
    
    // User A
    const responseA = await agent.generateText(
        "Hi, I'm Bob and I love cooking Italian food.",
        { userId: "userA", conversationId: "conv-a1" }
    );
    console.log("User A - Agent:", responseA.text);
    
    // User B
    const responseB = await agent.generateText(
        "Hello, my name is Carol and I'm learning machine learning.",
        { userId: "userB", conversationId: "conv-b1" }
    );
    console.log("User B - Agent:", responseB.text);
    
    // Back to User A - should remember Bob, not Carol
    const responseA2 = await agent.generateText(
        "What do you remember about me?",
        { userId: "userA", conversationId: "conv-a2" }
    );
    console.log("User A again - Agent:", responseA2.text);
}

// Run examples
demonstrateMemory()
    .then(() => demonstrateMultiUser())
    .catch(console.error);`;

const packageJsonCode = `{
  "name": "voltagent-memory-example",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node index.js"
  },
  "dependencies": {
    "@voltagent/core": "^0.1.52",
    "@voltagent/vercel-ai": "^0.1.13",
    "@voltagent/libsql": "^0.1.10",
    "@ai-sdk/openai": "^1.3.10",
    "zod": "^3.24.2"
  }
}`;

const files = {
  "src/index.js": {
    code: memoryCode,
    active: true,
  },
  "package.json": {
    code: packageJsonCode,
  },
};

const dependencies = {
  "@voltagent/core": "^0.1.52",
  "@voltagent/vercel-ai": "^0.1.13",
  "@voltagent/libsql": "^0.1.10",
  "@ai-sdk/openai": "^1.3.10",
  zod: "^3.24.2",
};

export default function TutorialMemory() {
  return (
    <TutorialLayout
      currentStep={3}
      totalSteps={5}
      stepTitle="Memory: Agents That Remember"
      stepDescription="Learn how to give your agents memory to maintain context across conversations"
      nextStepUrl="/tutorial/mcp"
      prevStepUrl="/tutorial/chatbot-problem"
    >
      <div className="space-y-8">
        {/* The Problem: Forgetful Agents */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            The Problem: Your Agent Has Amnesia
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Your weather agent works, but there's a massive problem: it forgets
            everything after each conversation. It's like talking to someone
            with short-term memory loss.
          </p>

          <div className="border-solid border-red-500 rounded-lg p-6 bg-gray-800/50">
            <h3 className="text-xl font-semibold text-red-300 mb-4">
              Without Memory, Your Agent:
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-red-400">•</span>
                <span className="text-gray-300">
                  Always says "Hello, how can I help?" even to returning users
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-red-400">•</span>
                <span className="text-gray-300">
                  Forgets what you asked 5 minutes ago
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-red-400">•</span>
                <span className="text-gray-300">
                  Can't remember user preferences or details
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-red-400">•</span>
                <span className="text-gray-300">
                  Feels robotic and unnatural
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h4 className="text-white font-semibold mb-3">Real Example</h4>
            <div className="space-y-3">
              <div className="bg-blue-900/20 p-3 rounded border-l-4 border-blue-400">
                <strong className="text-blue-400">User:</strong> "Hi, my name is
                John."
              </div>
              <div className="bg-green-900/20 p-3 rounded border-l-4 border-green-400">
                <strong className="text-green-400">Agent:</strong> "Hello John!
                How can I help you?"
              </div>
              <div className="bg-blue-900/20 p-3 rounded border-l-4 border-blue-400">
                <strong className="text-blue-400">User:</strong> "What's my
                name?"
              </div>
              <div className="bg-red-900/20 p-3 rounded border-l-4 border-red-400">
                <strong className="text-red-400">Agent (No Memory):</strong> "I
                don't know your name."
              </div>
            </div>
          </div>
        </div>

        {/* Solution: Memory */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            The Solution: Memory System
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            VoltAgent has a built-in memory system that makes your agents
            remember conversations. But there's one crucial thing:{" "}
            <strong>memory only works when you provide a userId</strong>.
          </p>

          <div className="rounded-lg p-6 border-solid border-emerald-500  bg-gray-800/50">
            <h3 className="text-xl font-semibold text-[#00d992] mb-4">
              Automatic Memory (Zero Configuration)
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-[#00d992] mt-1">•</span>
                <span className="text-gray-300">
                  Memory is enabled by default when you create an agent
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-[#00d992] mt-1">•</span>
                <span className="text-gray-300">
                  Creates{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">
                    .voltagent/memory.db
                  </code>{" "}
                  file in your project
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-[#00d992] mt-1">•</span>
                <span className="text-gray-300">
                  Conversation history is automatically saved
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-yellow-400 mt-1">!</span>
                <span className="text-gray-300">
                  <strong>Requires userId to function properly</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6">
            <h4 className="text-yellow-300 font-semibold mb-3">
              Critical: userId Required for Memory
            </h4>
            <p className="text-gray-300">
              Without a{" "}
              <code className="bg-gray-800 px-2 py-1 rounded">userId</code>,
              your agent can't properly isolate and store conversations. This is
              the most common reason why memory "doesn't work" in VoltAgent.
            </p>
          </div>
        </div>

        {/* Memory in Action */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Memory in Action: Test Your Agent
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Run your weather agent and test memory functionality. The key is
            setting a userId - without it, memory won't work properly.
          </p>

          {/* VoltOps Testing */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
            <h4 className="text-blue-300 font-semibold mb-3">
              Testing with VoltOps Console
            </h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 mt-1">1.</span>
                <span className="text-gray-300">
                  Go to{" "}
                  <a
                    href="https://console.voltagent.dev"
                    target="_blank"
                    className="text-blue-400 hover:underline"
                  >
                    console.voltagent.dev
                  </a>
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 mt-1">2.</span>
                <span className="text-gray-300">
                  Click the <strong>Settings icon</strong> (gear) in the chat
                  interface
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 mt-1">3.</span>
                <span className="text-gray-300">
                  Set{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">userId</code>{" "}
                  to something like{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">
                    "sarah-123"
                  </code>
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 mt-1">4.</span>
                <span className="text-gray-300">
                  Set{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">
                    conversationId
                  </code>{" "}
                  to{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">
                    "test-memory"
                  </code>
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 mt-1">5.</span>
                <span className="text-gray-300">
                  Now test the conversation below!
                </span>
              </div>
            </div>
          </div>

          {/* Memory Demo GIF */}
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h4 className="text-white font-semibold mb-3">
              See Memory in Action
            </h4>
            <p className="text-gray-300 mb-4">
              This demo shows how memory works with proper userId and
              conversationId settings in VoltOps:
            </p>
            <div className="rounded-lg overflow-hidden border border-gray-600">
              <img
                src="https://cdn.voltagent.dev/docs/tutorial/voltops-memory-demo.gif"
                alt="VoltOps Memory Demo - Agent remembering user information"
                className="w-full h-auto"
              />
            </div>
            <p className="text-gray-400 text-sm mt-3 text-center">
              Memory working: Agent remembers the user's name across messages
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h4 className="text-white font-semibold mb-3">
              Test Scenario (with userId set)
            </h4>
            <div className="space-y-3">
              <div className="bg-blue-900/20 p-3 rounded border-l-4 border-blue-400">
                <strong className="text-blue-400">1st Message:</strong> "Hi, my
                name is Sarah."
              </div>
              <div className="bg-green-900/20 p-3 rounded border-l-4 border-green-400">
                <strong className="text-green-400">Agent:</strong> "Hello Sarah!
                How can I help you?"
              </div>
              <div className="bg-blue-900/20 p-3 rounded border-l-4 border-blue-400">
                <strong className="text-blue-400">2nd Message:</strong> "What's
                the weather in London today?"
              </div>
              <div className="bg-green-900/20 p-3 rounded border-l-4 border-green-400">
                <strong className="text-green-400">Agent:</strong> "Checking
                London weather for you..."
              </div>
              <div className="bg-blue-900/20 p-3 rounded border-l-4 border-blue-400">
                <strong className="text-blue-400">3rd Message:</strong> "What's
                my name again?"
              </div>
              <div className="bg-green-900/20 p-3 rounded border-l-4 border-green-400">
                <strong className="text-green-400">Agent (with memory):</strong>{" "}
                "Your name is Sarah!"
              </div>
            </div>
          </div>

          <div className="rounded-lg p-6 border-solid border-emerald-500  bg-gray-800/50">
            <h4 className="text-[#00d992] font-semibold mb-2">
              The Power of Proper Memory Setup!
            </h4>
            <p className="text-gray-300">
              With the correct userId and conversationId, your agent now
              remembers previous conversations and provides a natural,
              contextual experience. This transforms user experience from
              robotic to human-like.
            </p>
          </div>
        </div>

        {/* User and Conversation IDs */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            User and Conversation IDs
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            In real applications, you have multiple users and conversations.
            VoltAgent uses{" "}
            <code className="bg-gray-800 px-2 py-1 rounded">userId</code> and{" "}
            <code className="bg-gray-800 px-2 py-1 rounded">
              conversationId
            </code>{" "}
            to keep them separate.
            <strong className="text-[#00d992]">
              {" "}
              userId is mandatory for proper memory functionality.
            </strong>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-blue-300 mb-4">
                userId
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-blue-400 mt-1">•</span>
                  <span className="text-gray-300">
                    Unique identifier for each user
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-blue-400 mt-1">•</span>
                  <span className="text-gray-300">
                    Users can't see each other's conversations
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-blue-400 mt-1">•</span>
                  <span className="text-gray-300">
                    Example: "user-123", "john@email.com"
                  </span>
                </div>
              </div>
            </div>

            <div className=" border-solid border-emerald-500 rounded-lg p-6 bg-gray-800/50">
              <h3 className="text-xl font-semibold text-green-300 mb-4">
                conversationId
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 ">•</span>
                  <span className="text-gray-300">
                    Unique identifier for each conversation thread
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 ">•</span>
                  <span className="text-gray-300">
                    Users can have multiple conversations
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 ">•</span>
                  <span className="text-gray-300">
                    Example: "support-case-456", "chat-xyz"
                  </span>
                </div>
              </div>
            </div>
          </div>

          <ColorModeProvider>
            <CodeBlock
              language="typescript"
              title="How to Use Memory Properly - userId is Required"
            >
              {`// ❌ WITHOUT userId - Memory won't work properly
const badResponse = await agent.generateText("Hi, my name is Alice.");
// Uses default userId, memory isolation fails

// ✅ WITH userId - Memory works correctly
const response1 = await agent.generateText("Hi, my name is Alice.", {
  userId: "alice-123",              // REQUIRED for memory to work
  conversationId: "chat-session-1"  // Optional but recommended
});

const response2 = await agent.generateText("What's my name?", {
  userId: "alice-123",              // SAME userId = access to memory
  conversationId: "chat-session-1" // SAME conversation = full context
});
// Agent: "Your name is Alice!" ✅ Memory working!

// Different user = isolated memory
const response3 = await agent.generateText("Hello, I'm Bob.", {
  userId: "bob-456",               // DIFFERENT userId = separate memory
  conversationId: "chat-session-2"
});

// Same user, new conversation = fresh start but same user profile
const response4 = await agent.generateText("Let's talk about something new.", {
  userId: "alice-123",              // SAME user
  conversationId: "new-topic"      // NEW conversation = fresh context
});`}
            </CodeBlock>
          </ColorModeProvider>
        </div>

        {/* Memory Providers */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">Memory Options</h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            VoltAgent offers different memory types. Choose the one that fits
            your needs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                LibSQLStorage (Default)
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-[#00d992] mt-1">•</span>
                  <span className="text-gray-300">Used automatically</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-[#00d992] mt-1">•</span>
                  <span className="text-gray-300">Local SQLite file</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-[#00d992] mt-1">•</span>
                  <span className="text-gray-300">Turso support</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-[#00d992] mt-1">•</span>
                  <span className="text-gray-300">Perfect for development</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                InMemoryStorage
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-yellow-400 mt-1">•</span>
                  <span className="text-gray-300">Very fast</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-yellow-400 mt-1">•</span>
                  <span className="text-gray-300">
                    Ideal for testing and development
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-400">!</span>
                  <span className="text-gray-300">
                    Data lost when app restarts
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                PostgreSQL
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-purple-400 mt-1">•</span>
                  <span className="text-gray-300">Enterprise-grade</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-purple-400 mt-1">•</span>
                  <span className="text-gray-300">Complex queries</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-purple-400 mt-1">•</span>
                  <span className="text-gray-300">Perfect for production</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                Supabase
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 ">•</span>
                  <span className="text-gray-300">Cloud-based</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 ">•</span>
                  <span className="text-gray-300">Easy setup</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 ">•</span>
                  <span className="text-gray-300">Auto-scaling</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Memory Options */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Custom Memory Options
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            If the default memory isn't enough, you can create your own memory
            provider.
          </p>

          <ColorModeProvider>
            <CodeBlock language="typescript" title="Disabling Memory">
              {`// Completely disable memory
const statelessAgent = new Agent({
  name: "Stateless Agent",
  instructions: "This agent remembers nothing.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  memory: false // Memory disabled
});`}
            </CodeBlock>
          </ColorModeProvider>

          <ColorModeProvider>
            <CodeBlock language="typescript" title="Using InMemory Storage">
              {`import { InMemoryStorage } from "@voltagent/core";

const fastAgent = new Agent({
  name: "Fast Agent",
  instructions: "This agent stores memory in RAM.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  memory: new InMemoryStorage()
});`}
            </CodeBlock>
          </ColorModeProvider>

          <ColorModeProvider>
            <CodeBlock language="typescript" title="PostgreSQL Memory">
              {`import { PostgreSQLStorage } from "@voltagent/postgres";

const productionAgent = new Agent({
  name: "Production Agent",
  instructions: "This agent stores memory in PostgreSQL.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  memory: new PostgreSQLStorage({
    connectionString: process.env.DATABASE_URL
  })
});`}
            </CodeBlock>
          </ColorModeProvider>
        </div>

        {/* Best Practices */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">Best Practices</h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Follow these tips to use memory effectively.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className=" border-solid border-emerald-500 rounded-lg p-6 bg-gray-800/50">
              <h3 className="text-xl font-semibold text-green-300 mb-4">
                Do This
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 ">•</span>
                  <span className="text-gray-300">
                    Always use userId and conversationId
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 ">•</span>
                  <span className="text-gray-300">Consider user privacy</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 ">•</span>
                  <span className="text-gray-300">
                    Use PostgreSQL/Supabase in production
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 ">•</span>
                  <span className="text-gray-300">
                    Use InMemory for testing
                  </span>
                </div>
              </div>
            </div>

            <div className="border-solid border-red-500 rounded-lg p-6 bg-gray-800/50">
              <h3 className="text-xl font-semibold text-red-300 mb-4">
                Don't Do This
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-red-400">•</span>
                  <span className="text-gray-300">
                    Don't ignore memory limits
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-400">•</span>
                  <span className="text-gray-300">
                    Don't log sensitive information
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-400">•</span>
                  <span className="text-gray-300">
                    Don't forget to handle memory errors
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-400">•</span>
                  <span className="text-gray-300">
                    Don't use InMemory in production
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* REST API Usage */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Using Memory via REST API
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            If you're building a web app or mobile app, you'll likely call your
            VoltAgent via REST API. Here's how to properly set userId and
            conversationId in API calls.
          </p>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h4 className="text-white font-semibold mb-3">API Server URL</h4>
            <p className="text-gray-300 mb-3">
              Your VoltAgent automatically starts an API server on port 3141 (or
              another available port):
            </p>
            <div className="bg-black rounded-lg p-4 border border-gray-600 font-mono text-sm">
              <div className="text-green-400">
                ✓ HTTP Server: http://localhost:3141
              </div>
              <div className="text-blue-400">
                ✓ Swagger UI: http://localhost:3141/ui
              </div>
            </div>
          </div>

          <ColorModeProvider>
            <CodeBlock
              language="bash"
              title="Basic API Call (Without Memory - Don't Do This)"
            >
              {`# ❌ Without userId - Memory won't work
curl -X POST http://localhost:3141/agents/your-agent-id/text \\
     -H "Content-Type: application/json" \\
     -d '{ 
       "input": "Hi, my name is Sarah. What's the weather like?" 
     }'`}
            </CodeBlock>
          </ColorModeProvider>

          <ColorModeProvider>
            <CodeBlock
              language="bash"
              title="Proper API Call (With Memory - Do This)"
            >
              {`# ✅ With userId and conversationId - Memory works!
curl -X POST http://localhost:3141/agents/your-agent-id/text \\
     -H "Content-Type: application/json" \\
     -d '{
       "input": "Hi, my name is Sarah. What\\'s the weather like?",
       "options": {
         "userId": "sarah-123",
         "conversationId": "weather-chat-001"
       }
     }'

# Follow-up message in same conversation
curl -X POST http://localhost:3141/agents/your-agent-id/text \\
     -H "Content-Type: application/json" \\
     -d '{
       "input": "What was my name again?",
       "options": {
         "userId": "sarah-123",
         "conversationId": "weather-chat-001"
       }
     }'
# Response: "Your name is Sarah!" ✅`}
            </CodeBlock>
          </ColorModeProvider>

          <ColorModeProvider>
            <CodeBlock
              language="javascript"
              title="JavaScript/TypeScript Example"
            >
              {`// Frontend code example
const userId = getCurrentUserId(); // Get from your auth system
const conversationId = generateConversationId(); // Generate or get existing

async function chatWithAgent(message) {
  const response = await fetch('http://localhost:3141/agents/your-agent-id/text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: message,
      options: {
        userId: userId,           // REQUIRED for memory
        conversationId: conversationId, // Optional but recommended
        temperature: 0.7,
        maxTokens: 500
      }
    })
  });

  const result = await response.json();
  return result.data;
}

// Usage
await chatWithAgent("Hi, I'm Sarah. What's the weather?");
await chatWithAgent("What's my name?"); // Will remember "Sarah"`}
            </CodeBlock>
          </ColorModeProvider>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
            <h4 className="text-blue-300 font-semibold mb-3">
              Key Points for API Usage
            </h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 mt-1">1.</span>
                <span className="text-gray-300">
                  Always include{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">userId</code>{" "}
                  in the{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">options</code>{" "}
                  object
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 mt-1">2.</span>
                <span className="text-gray-300">
                  Use the same{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">userId</code>{" "}
                  for the same user across all requests
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 mt-1">3.</span>
                <span className="text-gray-300">
                  Use the same{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">
                    conversationId
                  </code>{" "}
                  to maintain conversation context
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 mt-1">4.</span>
                <span className="text-gray-300">
                  Generate new{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">
                    conversationId
                  </code>{" "}
                  for new conversation threads
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 mt-1">5.</span>
                <span className="text-gray-300">
                  Check{" "}
                  <a
                    href="http://localhost:3141/ui"
                    target="_blank"
                    className="text-blue-400 hover:underline"
                  >
                    http://localhost:3141/ui
                  </a>{" "}
                  for interactive API docs
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TutorialLayout>
  );
}
