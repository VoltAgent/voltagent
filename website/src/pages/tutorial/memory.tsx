import type React from "react";
import { TutorialLayout } from "../../components/tutorial/TutorialLayout";
import CodeBlock from "@theme/CodeBlock";
import { ColorModeProvider } from "@docusaurus/theme-common/internal";
import { XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";

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
        {/* The Problem */}
        <div className="space-y-6">
          <h2 className="text-2xl landing-md:text-3xl font-bold text-white">
            The Problem: Agents with Amnesia
          </h2>
          <p className="text-landing-sm landing-md:text-base text-gray-300 leading-relaxed">
            Your agent can use tools, but every conversation starts from
            scratch. It can't remember previous interactions, learn from past
            conversations, or build context over time.
          </p>

          <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-4 landing-md:gap-6">
            <div className="border-solid border-red-500 rounded-lg p-4 landing-md:p-6 bg-gray-800/50">
              <h3 className="text-lg landing-md:text-xl font-semibold text-red-500 mb-3 landing-md:mb-4">
                Without Memory
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <XMarkIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-red-500 mt-1" />
                  <span className="text-landing-sm landing-md:text-base text-gray-300">
                    Asks for the same information repeatedly
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <XMarkIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-red-500 mt-1" />
                  <span className="text-landing-sm landing-md:text-base text-gray-300">
                    Can't build on previous conversations
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <XMarkIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-red-500 mt-1" />
                  <span className="text-landing-sm landing-md:text-base text-gray-300">
                    No user preferences or context
                  </span>
                </div>
              </div>
            </div>

            <div className="border-solid border-emerald-500 rounded-lg p-4 landing-md:p-6 bg-gray-800/50">
              <h3 className="text-lg landing-md:text-xl font-semibold text-emerald-500 mb-3 landing-md:mb-4">
                With Memory
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-emerald-500 mt-1" />
                  <span className="text-landing-sm landing-md:text-base text-gray-300">
                    Remembers user details and preferences
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-emerald-500 mt-1" />
                  <span className="text-landing-sm landing-md:text-base text-gray-300">
                    Builds context across conversations
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-emerald-500 mt-1" />
                  <span className="text-landing-sm landing-md:text-base text-gray-300">
                    Learns from interactions
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Types of Memory */}
        <div className="space-y-6">
          <h2 className="text-2xl landing-md:text-3xl font-bold text-white">
            Types of Agent Memory
          </h2>
          <p className="text-landing-sm landing-md:text-base text-gray-300 leading-relaxed">
            Different types of memory serve different purposes. Let's understand
            what each one does:
          </p>

          <div className="rounded-lg p-6 border-solid border-emerald-500 bg-gray-800/50">
            <h3 className="text-xl font-semibold text-[#00d992] mb-4">
              Automatic Memory (Zero Configuration)
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-[#00d992] ">•</span>
                <span className="text-gray-300">
                  Memory is enabled by default when you create an agent
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-[#00d992] ">•</span>
                <span className="text-gray-300">
                  Creates{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">
                    .voltagent/memory.db
                  </code>{" "}
                  file in your project
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-[#00d992] ">•</span>
                <span className="text-gray-300">
                  Conversation history is automatically saved
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-yellow-400 ">!</span>
                <span className="text-gray-300">
                  <strong>Requires userId to function properly</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 border-solid border border-yellow-500 rounded-lg p-6">
            <h4 className="text-yellow-300 font-semibold mb-3">
              Critical:{" "}
              <code className="bg-gray-800 px-2 py-1 rounded">userId</code>{" "}
              Required for Memory
            </h4>
            <p className="text-xs landing-md:text-landing-sm mb-0 text-gray-300 leading-relaxed">
              Without a{" "}
              <code className="bg-gray-800 px-2 py-1 rounded">userId</code>,
              your agent can't properly isolate and store conversations. This is
              the most common reason why memory "doesn't work" in VoltAgent.
            </p>
          </div>
        </div>

        {/* Memory in Action */}
        <div className="space-y-6">
          <h2 className="text-2xl landing-md:text-3xl font-bold text-white">
            Memory in Action: Test Your Agent
          </h2>
          <p className="text-landing-sm landing-md:text-base text-gray-300 leading-relaxed">
            Run your weather agent and test memory functionality. The key is
            setting a userId - without it, memory won't work properly.
          </p>

          {/* VoltOps Testing */}
          <div className="bg-gray-800/50 border-solid border border-blue-500 rounded-lg p-6">
            <h4 className="text-blue-300 font-semibold mb-3">
              Testing with VoltOps Console
            </h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-blue-400">1.</span>
                <span className="text-gray-300">
                  Go to{" "}
                  <a
                    href="https://console.voltagent.dev"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    console.voltagent.dev
                  </a>
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-400">2.</span>
                <span className="text-gray-300">
                  Click the <strong>Settings icon</strong> (gear) in the chat
                  interface
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-400">3.</span>
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
                <span className="text-blue-400">4.</span>
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
                <span className="text-blue-400">5.</span>
                <span className="text-gray-300">
                  Now test the conversation below!
                </span>
              </div>
            </div>
          </div>

          {/* Memory Demo GIF */}
          <div className="bg-gray-800/50 rounded-lg p-6 border-solid border border-gray-700">
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
            <p className="text-gray-400 text-sm mt-3 mb-0 text-center">
              Memory working: Agent remembers the user's name across messages
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h4 className="text-white font-semibold mb-3">
              Test Scenario (with userId set)
            </h4>
            <div className="space-y-3">
              <div className="p-3 rounded border-l-2 border-solid border-0 border-blue-400">
                <strong className="text-blue-400">1st Message:</strong> "Hi, my
                name is Sarah."
              </div>
              <div className="p-3 rounded border-l-2 border-solid border-0 border-green-400">
                <strong className="text-green-400">Agent:</strong> "Hello Sarah!
                How can I help you?"
              </div>
              <div className="p-3 rounded border-l-2 border-solid border-0 border-blue-400">
                <strong className="text-blue-400">2nd Message:</strong> "What's
                the weather in London today?"
              </div>
              <div className=" p-3 rounded border-l-2 border-solid border-0 border-green-400">
                <strong className="text-green-400">Agent:</strong> "Checking
                London weather for you..."
              </div>
              <div className="p-3 rounded border-l-2 border-solid border-0 border-blue-400">
                <strong className="text-blue-400">3rd Message:</strong> "What's
                my name again?"
              </div>
              <div className=" p-3 rounded border-l-2 border-solid border-0 border-green-400">
                <strong className="text-green-400">Agent (with memory):</strong>{" "}
                "Your name is Sarah!"
              </div>
            </div>
          </div>

          <div className="rounded-lg p-6 border-solid border-emerald-500 bg-gray-800/50">
            <h4 className="text-[#00d992] font-semibold mb-2">
              The Power of Proper Memory Setup!
            </h4>
            <p className="text-sm md:text-base mb-0 text-gray-300 leading-relaxed">
              With the correct userId and conversationId, your agent now
              remembers previous conversations and provides a natural,
              contextual experience. This transforms user experience from
              robotic to human-like.
            </p>
          </div>
        </div>

        {/* User and Conversation IDs */}
        <div className="space-y-6">
          <h2 className="text-2xl landing-md:text-3xl font-bold text-white">
            User and Conversation IDs
          </h2>
          <p className="text-landing-sm landing-md:text-base text-gray-300 leading-relaxed">
            In real applications, you have multiple users and conversations.
            VoltAgent uses{" "}
            <code className="bg-gray-800 px-2 py-1 rounded">userId</code> and{" "}
            <code className="bg-gray-800 px-2 py-1 rounded">
              conversationId
            </code>{" "}
            to keep them separate.
            <strong className="text-emerald-500">
              {" "}
              userId is mandatory for proper memory functionality.
            </strong>
          </p>

          <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 border-solid border border-blue-500 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-blue-300 mb-4">
                userId
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-blue-400 ">•</span>
                  <span className="text-gray-300">
                    Unique identifier for each user
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-blue-400 ">•</span>
                  <span className="text-gray-300">
                    Users can't see each other's conversations
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-blue-400 ">•</span>
                  <span className="text-gray-300">
                    Example: "user-123", "john@email.com"
                  </span>
                </div>
              </div>
            </div>

            <div className="border-solid border-emerald-500 rounded-lg p-6 bg-gray-800/50">
              <h3 className="text-xl font-semibold text-emerald-500 mb-4">
                conversationId
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-emerald-400 ">•</span>
                  <span className="text-gray-300">
                    Unique identifier for each conversation thread
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-emerald-400 ">•</span>
                  <span className="text-gray-300">
                    Users can have multiple conversations
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-emerald-400 ">•</span>
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
          <h2 className="text-2xl landing-md:text-3xl font-bold text-white">
            Memory Options
          </h2>
          <p className="text-landing-sm landing-md:text-base text-gray-300 leading-relaxed">
            VoltAgent offers different memory types. Choose the one that fits
            your needs.
          </p>

          <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 rounded-lg p-6 border-solid border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                LibSQLStorage (Default)
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-[#00d992] ">•</span>
                  <span className="text-gray-300">Used automatically</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-[#00d992] ">•</span>
                  <span className="text-gray-300">Local SQLite file</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-[#00d992] ">•</span>
                  <span className="text-gray-300">Turso support</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-[#00d992] ">•</span>
                  <span className="text-gray-300">Perfect for development</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6 border-solid border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                InMemoryStorage
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-yellow-400 ">•</span>
                  <span className="text-gray-300">Very fast</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-yellow-400 ">•</span>
                  <span className="text-gray-300">
                    Ideal for testing and development
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-500">!</span>
                  <span className="text-gray-300">
                    Data lost when app restarts
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6 border-solid border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                PostgreSQL
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-purple-400 ">•</span>
                  <span className="text-gray-300">Enterprise-grade</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-purple-400 ">•</span>
                  <span className="text-gray-300">Complex queries</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-purple-400 ">•</span>
                  <span className="text-gray-300">Perfect for production</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6 border-solid border border-gray-700">
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
          <h2 className="text-2xl landing-md:text-3xl font-bold text-white">
            Custom Memory Options
          </h2>
          <p className="text-landing-sm landing-md:text-base text-gray-300 leading-relaxed">
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
          <h2 className="text-2xl landing-md:text-3xl font-bold text-white">
            Best Practices
          </h2>
          <p className="text-landing-sm landing-md:text-base text-gray-300 leading-relaxed">
            Follow these tips to use memory effectively.
          </p>

          <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-6">
            <div className="border-solid border-emerald-500 rounded-lg p-6 bg-gray-800/50">
              <h3 className="text-xl font-semibold text-emerald-500 mb-4">
                Do This
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-emerald-400 ">•</span>
                  <span className="text-gray-300">
                    Always use userId and conversationId
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-emerald-400 ">•</span>
                  <span className="text-gray-300">Consider user privacy</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-emerald-400 ">•</span>
                  <span className="text-gray-300">
                    Use PostgreSQL/Supabase in production
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-emerald-400 ">•</span>
                  <span className="text-gray-300">
                    Use InMemory for testing
                  </span>
                </div>
              </div>
            </div>

            <div className="border-solid border-red-500 rounded-lg p-6 bg-gray-800/50">
              <h3 className="text-xl font-semibold text-red-500 mb-4">
                Don't Do This
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-red-500">•</span>
                  <span className="text-gray-300">
                    Don't ignore memory limits
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-500">•</span>
                  <span className="text-gray-300">
                    Don't log sensitive information
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-500">•</span>
                  <span className="text-gray-300">
                    Don't forget to handle memory errors
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-500">•</span>
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
          <h2 className="text-2xl landing-md:text-3xl font-bold text-white">
            Using Memory via REST API
          </h2>
          <p className="text-landing-sm landing-md:text-base text-gray-300 leading-relaxed">
            If you're building a web app or mobile app, you'll likely call your
            VoltAgent via REST API. Here's how to properly set userId and
            conversationId in API calls.
          </p>

          <div className="bg-gray-800/50 rounded-lg p-6 border-solid border border-gray-700">
            <h4 className="text-white font-semibold mb-3">API Server URL</h4>
            <p className="text-landing-sm landing-md:text-base text-gray-300 leading-relaxed">
              Your VoltAgent automatically starts an API server on port 3141 (or
              another available port):
            </p>
            <div className="bg-black rounded-lg p-4 border-solid border border-gray-600 font-mono text-landing-sm">
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

          <div className="bg-gray-800/50 border-solid border border-blue-500 rounded-lg p-6">
            <h4 className="text-blue-300 font-semibold mb-3">
              Key Points for API Usage
            </h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 ">1.</span>
                <span className="text-gray-300">
                  Always include{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">userId</code>{" "}
                  in the{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">options</code>{" "}
                  object
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 ">2.</span>
                <span className="text-gray-300">
                  Use the same{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">userId</code>{" "}
                  for the same user across all requests
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 ">3.</span>
                <span className="text-gray-300">
                  Use the same{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">
                    conversationId
                  </code>{" "}
                  to maintain conversation context
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 ">4.</span>
                <span className="text-gray-300">
                  Generate new{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">
                    conversationId
                  </code>{" "}
                  for new conversation threads
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-blue-400 ">5.</span>
                <span className="text-gray-300">
                  Check{" "}
                  <a
                    href="http://localhost:3141/ui"
                    target="_blank"
                    rel="noreferrer"
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
