import { ColorModeProvider } from "@docusaurus/theme-common/internal";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import CodeBlock from "@theme/CodeBlock";
import type React from "react";
import { TutorialLayout } from "../../components/tutorial/TutorialLayout";

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
      <div className="space-y-24">
        {/* Video Introduction - Modern Design */}
        <div className="relative">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-purple-500/5 rounded-3xl blur-3xl -z-10" />

          <div className="relative">
            <div className="max-w-4xl mx-auto">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-purple-500/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-300" />
                <div className="relative w-full h-0 pb-[56.25%] rounded-xl overflow-hidden border border-solid border-white/10 bg-black/40 backdrop-blur-sm">
                  <iframe
                    src="https://www.youtube.com/embed/agy4YjzPEJ8"
                    title="VoltAgent Memory Tutorial - Agents That Remember"
                    className="absolute top-0 left-0 w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Problem */}
        <div className="relative mb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5 rounded-3xl blur-3xl -z-10" />

          <div className="relative border border-solid border-white/10 rounded-2xl p-8 landing-md:p-10 bg-white/[0.02] backdrop-blur-sm to-transparent backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 via-orange-500 to-transparent rounded-l-2xl" />

            <h2 className="text-[21.6px] font-medium text-foreground mb-3">
              The Problem: Agents with Amnesia
            </h2>
            <p className="text-landing-sm landing-md:text-base text-muted-foreground leading-relaxed mb-8">
              Your agent can use tools, but every conversation starts from scratch. It can't
              remember previous interactions, learn from past conversations, or build context over
              time.
            </p>

            <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-3">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-300" />
                <div className="relative border border-solid border-red-500/20 bg-red-500/[0.03] backdrop-blur-sm rounded-xl p-4 landing-md:p-6 hover:border-red-500/30 transition-colors">
                  <h3 className="text-[20px] font-medium text-red-300 mb-3 landing-md:mb-4">
                    Without Memory
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <XMarkIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-red-400 mt-1" />
                      <span className="text-landing-sm landing-md:text-base text-muted-foreground">
                        Asks for the same information repeatedly
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <XMarkIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-red-400 mt-1" />
                      <span className="text-landing-sm landing-md:text-base text-muted-foreground">
                        Can't build on previous conversations
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <XMarkIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-red-400 mt-1" />
                      <span className="text-landing-sm landing-md:text-base text-muted-foreground">
                        No user preferences or context
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-300" />
                <div className="relative border border-solid border-emerald-500/20 bg-emerald-500/[0.03] backdrop-blur-sm rounded-xl p-4 landing-md:p-6 hover:border-emerald-500/30 transition-colors">
                  <h3 className="text-[20px] font-medium text-emerald-300 mb-3 landing-md:mb-4">
                    With Memory
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-emerald-400 mt-1" />
                      <span className="text-landing-sm landing-md:text-base text-muted-foreground">
                        Remembers user details and preferences
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-emerald-400 mt-1" />
                      <span className="text-landing-sm landing-md:text-base text-muted-foreground">
                        Builds context across conversations
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-emerald-400 mt-1" />
                      <span className="text-landing-sm landing-md:text-base text-muted-foreground">
                        Learns from interactions
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Types of Memory */}
        <div className="space-y-6">
          <h2 className="text-[21.6px] font-medium text-foreground">Types of Agent Memory</h2>
          <p className="text-landing-sm landing-md:text-base text-muted-foreground leading-relaxed">
            Different types of memory serve different purposes. Let's understand what each one does:
          </p>

          <div className=" ">
            <h3 className="text-xl font-semibold  mb-4">Automatic Memory (Zero Configuration)</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-main-emerald ">•</span>
                <span className="text-muted-foreground">
                  Memory is enabled by default when you create an agent
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-main-emerald ">•</span>
                <span className="text-muted-foreground">
                  Creates{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">.voltagent/memory.db</code> file
                  in your project
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-main-emerald ">•</span>
                <span className="text-muted-foreground">
                  Conversation history is automatically saved
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-yellow-400 ">!</span>
                <span className="text-muted-foreground">
                  <strong>Requires userId to function properly</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="border-solid border border-white/10 bg-white/[0.02] backdrop-blur-sm rounded-lg p-6">
            <h4 className="text-[#a5d6ff] font-semibold mb-3">
              Critical: <code className="bg-gray-800 px-2 py-1 rounded">userId</code> Required for
              Memory
            </h4>
            <p className="text-xs landing-md:text-base mb-0 text-muted-foreground leading-relaxed">
              Without a <code className="bg-gray-800 px-2 py-1 rounded">userId</code>, your agent
              can't properly isolate and store conversations. This is the most common reason why
              memory "doesn't work" in VoltAgent.
            </p>
          </div>
        </div>

        {/* Memory in Action */}
        <div className="space-y-6">
          <h2 className="text-[21.6px] font-medium text-foreground">
            Memory in Action: Test Your Agent
          </h2>
          <p className="text-landing-sm landing-md:text-base text-muted-foreground leading-relaxed">
            Run your weather agent and test memory functionality. The key is setting a userId -
            without it, memory won't work properly.
          </p>

          {/* VoltOps Testing */}
          <div className="  rounded-lg">
            <h4 className="font-semibold mb-3">Testing with VoltOps Console</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-emerald-400">1.</span>
                <span className="text-muted-foreground">
                  Go to{" "}
                  <a
                    href="https://console.voltagent.dev"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline"
                  >
                    console.voltagent.dev
                  </a>
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-emerald-400">2.</span>
                <span className="text-muted-foreground">
                  Click the <strong>Settings icon</strong> (gear) in the chat interface
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-emerald-400">3.</span>
                <span className="text-muted-foreground">
                  Set <code className="bg-gray-800 px-2 py-1 rounded">userId</code> to something
                  like <code className="bg-gray-800 px-2 py-1 rounded">"sarah-123"</code>
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-emerald-400">4.</span>
                <span className="text-muted-foreground">
                  Set <code className="bg-gray-800 px-2 py-1 rounded">conversationId</code> to{" "}
                  <code className="bg-gray-800 px-2 py-1 rounded">"test-memory"</code>
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-emerald-400">5.</span>
                <span className="text-muted-foreground">Now test the conversation below!</span>
              </div>
            </div>
          </div>

          {/* Memory Demo GIF */}
          <div className="">
            <h4 className="text-[20px] font-medium text-foreground mb-3">See Memory in Action</h4>
            <p className="text-muted-foreground mb-4 text-sm landing-md:text-base">
              This demo shows how memory works with proper userId and conversationId settings in
              VoltOps:
            </p>
            <div className="rounded-lg overflow-hidden border border-white/10 bg-white/[0.02] backdrop-blur-sm">
              <img
                src="https://cdn.voltagent.dev/docs/tutorial/voltops-memory-demo.gif"
                alt="VoltOps Memory Demo - Agent remembering user information"
                className="w-full h-auto"
              />
            </div>
            <p className="text-muted-foreground text-sm mt-3 mb-0 text-center">
              Memory working: Agent remembers the user's name across messages
            </p>
          </div>

          <div className=" ">
            <h4 className="text-foreground font-semibold mb-3">Test Scenario (with userId set)</h4>
            <div className="space-y-3">
              <div className="p-3 rounded border-l-2 border-solid border-0 border-gray-400">
                <strong className="text-muted-foreground">1st Message:</strong> "Hi, my name is
                Sarah."
              </div>
              <div className="p-3 rounded border-l-2 border-solid border-0 border-emerald-400">
                <strong className="text-emerald-400">Agent:</strong> "Hello Sarah! How can I help
                you?"
              </div>
              <div className="p-3 rounded border-l-2 border-solid border-0 border-gray-400">
                <strong className="text-muted-foreground">2nd Message:</strong> "What's the weather
                in London today?"
              </div>
              <div className=" p-3 rounded border-l-2 border-solid border-0 border-emerald-400">
                <strong className="text-emerald-400">Agent:</strong> "Checking London weather for
                you..."
              </div>
              <div className="p-3 rounded border-l-2 border-solid border-0 border-gray-400">
                <strong className="text-muted-foreground">3rd Message:</strong> "What's my name
                again?"
              </div>
              <div className=" p-3 rounded border-l-2 border-solid border-0 border-emerald-400">
                <strong className="text-emerald-400">Agent (with memory):</strong> "Your name is
                Sarah!"
              </div>
            </div>
          </div>

          <div className="rounded-lg ">
            <h4 className="text-main-emerald font-semibold  text-sm md:text-base mb-2">
              The Power of Proper Memory Setup!
            </h4>
            <p className="text-sm md:text-base mb-0 text-muted-foreground leading-relaxed">
              With the correct userId and conversationId, your agent now remembers previous
              conversations and provides a natural, contextual experience. This transforms user
              experience from robotic to human-like.
            </p>
          </div>
        </div>

        {/* User and Conversation IDs */}
        <div className="space-y-6">
          <h2 className="text-[21.6px] font-medium text-foreground">User and Conversation IDs</h2>
          <p className="text-landing-sm landing-md:text-base text-muted-foreground leading-relaxed">
            In real applications, you have multiple users and conversations. VoltAgent uses{" "}
            <code className=" px-2 py-1 rounded">userId</code> and{" "}
            <code className=" px-2 py-1 rounded">conversationId</code> to keep them separate.
            <strong className=""> userId is mandatory for proper memory functionality.</strong>
          </p>

          <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-6">
            <div className="border-solid border border-white/10 bg-white/[0.02] backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-semibold  mb-4">userId</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-emerald-400 ">•</span>
                  <span className="text-muted-foreground">Unique identifier for each user</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-emerald-400 ">•</span>
                  <span className="text-muted-foreground">
                    Users can't see each other's conversations
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-emerald-400 ">•</span>
                  <span className="text-muted-foreground">
                    Example: "user-123", "john@email.com"
                  </span>
                </div>
              </div>
            </div>

            <div className="border-solid border border-white/10 bg-white/[0.02] backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-semibold text-emerald-500 mb-4">conversationId</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-emerald-400 ">•</span>
                  <span className="text-muted-foreground">
                    Unique identifier for each conversation thread
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-emerald-400 ">•</span>
                  <span className="text-muted-foreground">
                    Users can have multiple conversations
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-emerald-400 ">•</span>
                  <span className="text-muted-foreground">
                    Example: "support-case-456", "chat-xyz"
                  </span>
                </div>
              </div>
            </div>
          </div>

          <ColorModeProvider>
            <CodeBlock language="typescript">
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
          <h2 className="text-[21.6px] font-medium text-foreground">Memory Options</h2>
          <p className="text-landing-sm landing-md:text-base text-muted-foreground leading-relaxed">
            VoltAgent offers different memory types. Choose the one that fits your needs.
          </p>

          <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-6">
            <div className=" rounded-lg p-6 border-solid border border-white/10 bg-white/[0.02] backdrop-blur-sm">
              <h3 className="text-xl font-semibold text-foreground mb-4">
                LibSQLMemoryAdapter (SQLite/Turso)
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-main-emerald ">•</span>
                  <span className="text-muted-foreground">
                    Optional persistent storage via adapter
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-main-emerald ">•</span>
                  <span className="text-muted-foreground">Local SQLite file</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-main-emerald ">•</span>
                  <span className="text-muted-foreground">Turso support</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-main-emerald ">•</span>
                  <span className="text-muted-foreground">Perfect for development</span>
                </div>
              </div>
            </div>

            <div className=" rounded-lg p-6 border-solid border border-white/10 bg-white/[0.02] backdrop-blur-sm">
              <h3 className="text-xl font-semibold text-foreground mb-4">
                Default InMemory (no persistence)
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-yellow-400 ">•</span>
                  <span className="text-muted-foreground">Very fast</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-yellow-400 ">•</span>
                  <span className="text-muted-foreground">Ideal for testing and development</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-500">!</span>
                  <span className="text-muted-foreground">Data lost when app restarts</span>
                </div>
              </div>
            </div>

            <div className=" rounded-lg p-6 border-solid border border-white/10 bg-white/[0.02] backdrop-blur-sm">
              <h3 className="text-xl font-semibold text-foreground mb-4">PostgreSQL</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-purple-400 ">•</span>
                  <span className="text-muted-foreground">Enterprise-grade</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-purple-400 ">•</span>
                  <span className="text-muted-foreground">Complex queries</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-purple-400 ">•</span>
                  <span className="text-muted-foreground">Perfect for production</span>
                </div>
              </div>
            </div>

            <div className=" rounded-lg p-6 border-solid border border-white/10 bg-white/[0.02] backdrop-blur-sm">
              <h3 className="text-xl font-semibold text-foreground mb-4">Supabase</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-[#d2a8ff] ">•</span>
                  <span className="text-muted-foreground">Cloud-based</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-[#d2a8ff] ">•</span>
                  <span className="text-muted-foreground">Easy setup</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-[#d2a8ff] ">•</span>
                  <span className="text-muted-foreground">Auto-scaling</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Memory Options */}
        <div className="space-y-6">
          <h2 className="text-[21.6px] font-medium text-foreground">Custom Memory Options</h2>
          <p className="text-landing-sm landing-md:text-base text-muted-foreground leading-relaxed">
            If the default memory isn't enough, you can create your own memory provider.
          </p>

          <ColorModeProvider>
            <CodeBlock language="typescript">
              {`// Completely disable memory
const statelessAgent = new Agent({
  name: "Stateless Agent",
  instructions: "This agent remembers nothing.",
  
  model: openai("gpt-4o-mini"),
  memory: false // Memory disabled
});`}
            </CodeBlock>
          </ColorModeProvider>

          <ColorModeProvider>
            <CodeBlock language="typescript">
              {`import { InMemoryStorage } from "@voltagent/core";

const fastAgent = new Agent({
  name: "Fast Agent",
  instructions: "This agent stores memory in RAM.",
  
  model: openai("gpt-4o-mini"),
  memory: new InMemoryStorage()
});`}
            </CodeBlock>
          </ColorModeProvider>

          <ColorModeProvider>
            <CodeBlock language="typescript">
              {`import { PostgreSQLStorage } from "@voltagent/postgres";

const productionAgent = new Agent({
  name: "Production Agent",
  instructions: "This agent stores memory in PostgreSQL.",
  
  model: openai("gpt-4o-mini"),
  memory: new PostgreSQLStorage({
    connectionString: process.env.DATABASE_URL
  })
});`}
            </CodeBlock>
          </ColorModeProvider>
        </div>

        {/* Best Practices */}
        <div className="relative mb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-red-500/5 rounded-3xl blur-3xl -z-10" />

          <div className="relative border border-solid border-white/10 rounded-2xl p-8 landing-md:p-10 bg-white/[0.02] backdrop-blur-sm to-transparent backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 via-yellow-500 to-red-500 rounded-l-2xl" />

            <h2 className="text-[21.6px] font-medium text-foreground mb-3">Best Practices</h2>
            <p className="text-landing-sm landing-md:text-base text-muted-foreground leading-relaxed mb-8">
              Follow these tips to use memory effectively.
            </p>

            <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-3">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-300" />
                <div className="relative border border-solid border-emerald-500/20 bg-emerald-500/[0.03] backdrop-blur-sm rounded-xl p-4 landing-md:p-5 hover:border-emerald-500/30 transition-colors">
                  <h3 className="text-[18px] font-medium text-emerald-300 mb-3">Do This</h3>
                  <div className="space-y-2.5">
                    <div className="flex items-start space-x-3">
                      <span className="text-emerald-400 text-sm">•</span>
                      <span className="text-muted-foreground text-sm">
                        Always use userId and conversationId
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-emerald-400 text-sm">•</span>
                      <span className="text-muted-foreground text-sm">Consider user privacy</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-emerald-400 text-sm">•</span>
                      <span className="text-muted-foreground text-sm">
                        Use PostgreSQL/Supabase in production
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-emerald-400 text-sm">•</span>
                      <span className="text-muted-foreground text-sm">
                        Use InMemory for testing
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-300" />
                <div className="relative border border-solid border-red-500/20 bg-red-500/[0.03] backdrop-blur-sm rounded-xl p-4 landing-md:p-5 hover:border-red-500/30 transition-colors">
                  <h3 className="text-[18px] font-medium text-red-300 mb-3">Don't Do This</h3>
                  <div className="space-y-2.5">
                    <div className="flex items-start space-x-3">
                      <span className="text-red-400 text-sm">•</span>
                      <span className="text-muted-foreground text-sm">
                        Don't ignore memory limits
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-red-400 text-sm">•</span>
                      <span className="text-muted-foreground text-sm">
                        Don't log sensitive information
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-red-400 text-sm">•</span>
                      <span className="text-muted-foreground text-sm">
                        Don't forget to handle memory errors
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-red-400 text-sm">•</span>
                      <span className="text-muted-foreground text-sm">
                        Don't use InMemory in production
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* REST API Usage */}
        <div className="space-y-6">
          <h2 className="text-[21.6px] font-medium text-foreground">Using Memory via REST API</h2>
          <p className="text-landing-sm landing-md:text-base text-muted-foreground leading-relaxed">
            If you're building a web app or mobile app, you'll likely call your VoltAgent via REST
            API. Here's how to properly set userId and conversationId in API calls.
          </p>

          <div className="rounded-lg p-6 border-solid border border-white/10 bg-white/[0.02] backdrop-blur-sm">
            <h4 className="text-foreground font-semibold mb-3">API Server URL</h4>
            <p className="text-landing-sm landing-md:text-base text-muted-foreground leading-relaxed">
              Your VoltAgent automatically starts an API server on port 3141 (or another available
              port):
            </p>
            <div className="bg-black rounded-lg p-4 border-solid border border-white/10 bg-white/[0.02] backdrop-blur-sm font-mono text-landing-sm">
              <div className="text-emerald-400">✓ HTTP Server: http://localhost:3141</div>
              <div className="text-emerald-400">✓ Swagger UI: http://localhost:3141/ui</div>
            </div>
          </div>

          <ColorModeProvider>
            <CodeBlock language="bash">
              {`# ❌ Without userId - Memory won't work
curl -X POST http://localhost:3141/agents/my-agent/text \\
     -H "Content-Type: application/json" \\
     -d '{ 
       "input": "Hi, my name is Sarah. What's the weather like?" 
     }'`}
            </CodeBlock>
          </ColorModeProvider>

          <ColorModeProvider>
            <CodeBlock language="bash">
              {`# ✅ With userId and conversationId - Memory works!
curl -X POST http://localhost:3141/agents/my-agent/text \\
     -H "Content-Type: application/json" \\
     -d '{
       "input": "Hi, my name is Sarah. What\\'s the weather like?",
       "options": {
         "userId": "sarah-123",
         "conversationId": "weather-chat-001"
       }
     }'

# Follow-up message in same conversation
curl -X POST http://localhost:3141/agents/my-agent/text \\
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
            <CodeBlock language="javascript">
              {`// Frontend code example
const userId = getCurrentUserId(); // Get from your auth system
const conversationId = generateConversationId(); // Generate or get existing

async function chatWithAgent(message) {
  const response = await fetch('http://localhost:3141/agents/my-agent/text', {
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

          <div className=" ">
            <h4 className=" font-semibold mb-3">Key Points for API Usage</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-muted-foreground ">1.</span>
                <span className="text-muted-foreground">
                  Always include <code className="bg-gray-800 px-2 py-1 rounded">userId</code> in
                  the <code className="bg-gray-800 px-2 py-1 rounded">options</code> object
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-muted-foreground ">2.</span>
                <span className="text-muted-foreground">
                  Use the same <code className="bg-gray-800 px-2 py-1 rounded">userId</code> for the
                  same user across all requests
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-muted-foreground ">3.</span>
                <span className="text-muted-foreground">
                  Use the same <code className="bg-gray-800 px-2 py-1 rounded">conversationId</code>{" "}
                  to maintain conversation context
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-muted-foreground ">4.</span>
                <span className="text-muted-foreground">
                  Generate new <code className="bg-gray-800 px-2 py-1 rounded">conversationId</code>{" "}
                  for new conversation threads
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-muted-foreground ">5.</span>
                <span className="text-muted-foreground">
                  Check{" "}
                  <a
                    href="http://localhost:3141/ui"
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:underline"
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
