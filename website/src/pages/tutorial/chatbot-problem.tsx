import type React from "react";
import { TutorialLayout } from "../../components/tutorial/TutorialLayout";
import CodeBlock from "@theme/CodeBlock";
import { ColorModeProvider } from "@docusaurus/theme-common/internal";

export default function ChatbotProblemTutorial() {
  return (
    <TutorialLayout
      currentStep={2}
      totalSteps={5}
      stepTitle="The Chatbot Problem: Why Basic Agents Are Useless"
      stepDescription="Understanding the limitations of basic agents and why they need tools"
      prevStepUrl="/tutorial/introduction"
      nextStepUrl="/tutorial/memory"
    >
      <div className="space-y-8">
        {/* The Problem */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            The Problem: Your Agent is Basically a Chatbot
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Let's be honest - the agent you just built can only chat. It can't{" "}
            <strong>do</strong> anything useful. It's like hiring a consultant
            who can only give advice but never take action.
          </p>

          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-red-300 mb-4">
              Try Asking Your Agent:
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
                <span className="text-gray-300">
                  "What's the weather in New York?"
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
                <span className="text-gray-300">
                  "Send an email to my boss"
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
                <span className="text-gray-300">
                  "Calculate my monthly expenses"
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
                <span className="text-gray-300">
                  "Create a calendar event for tomorrow"
                </span>
              </div>
            </div>
            <p className="text-red-300 mt-4 font-medium">
              Response: "I'm sorry, I can't actually do that for you..."
            </p>
          </div>
        </div>

        {/* Real World Example */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Real-World Example: The Useless Assistant
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Imagine you're building an AI assistant for your company. What would
            users actually want?
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
              <h4 className="text-white font-semibold mb-3">
                What Users Want:
              </h4>
              <div className="space-y-2 text-sm">
                <div className="text-gray-300">
                  "Book a meeting room for 3pm"
                </div>
                <div className="text-gray-300">
                  "Check our website's status"
                </div>
                <div className="text-gray-300">"Generate a sales report"</div>
                <div className="text-gray-300">"Order lunch for the team"</div>
                <div className="text-gray-300">"Deploy the new feature"</div>
              </div>
            </div>

            <div className="bg-red-900/20 p-6 rounded-lg border border-red-500/30">
              <h4 className="text-red-300 font-semibold mb-3">
                What Your Agent Says:
              </h4>
              <div className="space-y-2 text-sm">
                <div className="text-gray-300">
                  "I can't book rooms, but here's how..."
                </div>
                <div className="text-gray-300">
                  "I can't check websites, but you should..."
                </div>
                <div className="text-gray-300">
                  "I can't generate reports, but try..."
                </div>
                <div className="text-gray-300">
                  "I can't order food, but here are some..."
                </div>
                <div className="text-gray-300">
                  "I can't deploy code, but the process is..."
                </div>
              </div>
            </div>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-6">
            <h4 className="text-orange-400 font-semibold mb-2">
              The Reality Check
            </h4>
            <p className="text-gray-300">
              After a week, users stop using your "AI assistant" because it's
              just a fancy search engine that can't actually assist with
              anything. Sound familiar?
            </p>
          </div>
        </div>

        {/* The Solution: Real Code Example */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            The Solution: Give Your Agent Tools
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Let's fix your useless chatbot by adding a real tool. We'll create a
            weather agent that can actually check weather data.
          </p>

          <ColorModeProvider>
            <CodeBlock language="typescript" title="src/index.ts">
              {`import { VoltAgent, Agent, createTool } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";

import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const getWeatherTool = createTool({
  name: "get_weather",
  description: "Get current weather for any city",
  parameters: z.object({
    location: z.string().describe("City and state, e.g. New York, NY"),
  }),
  execute: async ({ location }) => {
    // In production, you'd call a real weather API
    console.log("Getting weather for " + location + "...");
    
    // Simple demo logic
    if (location.toLowerCase().includes("new york")) {
      return { temperature: "18°C", condition: "Partly cloudy" };
    }
    return { temperature: "24°C", condition: "Sunny" };
  },
});

const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant that answers questions without using tools",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [getWeatherTool],
});

new VoltAgent({
  agents: {
    agent,
  },
}); `}
            </CodeBlock>
          </ColorModeProvider>
        </div>

        {/* Developer Journey */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            The Developer Journey: Building Your First Tool
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Let's walk through what you're thinking as you build this tool.
          </p>

          <div className="space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-lg border-l-4 border-blue-500">
              <h4 className="text-blue-400 font-semibold mb-3 flex items-center">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm mr-3">
                  1
                </div>
                "I need to define what the tool does"
              </h4>
              <p className="text-gray-300 mb-3">
                <span className="text-blue-400 font-mono">createTool</span> is
                your starting point. Give it a clear name and description so the
                LLM knows when to use it. Think of this as writing documentation
                for a function.
              </p>
              <div className="bg-gray-900 rounded p-3">
                <code className="text-blue-400">
                  name: "get_weather" // What the LLM will call
                </code>
              </div>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg border-l-4 border-green-500">
              <h4 className="text-green-400 font-semibold mb-3 flex items-center">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm mr-3">
                  2
                </div>
                "What inputs does it need?"
              </h4>
              <p className="text-gray-300 mb-3">
                <span className="text-green-400 font-mono">parameters</span>{" "}
                uses Zod schemas to define and validate inputs. This is like
                defining function parameters but with runtime validation.
              </p>
              <div className="bg-gray-900 rounded p-3">
                <code className="text-green-400">
                  z.object({`{ location: z.string() }`}) // Type-safe inputs
                </code>
              </div>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg border-l-4 border-purple-500">
              <h4 className="text-purple-400 font-semibold mb-3 flex items-center">
                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm mr-3">
                  3
                </div>
                "What should it actually do?"
              </h4>
              <p className="text-gray-300 mb-3">
                <span className="text-purple-400 font-mono">execute</span> is
                where the magic happens. This is your regular async function
                that does the actual work. Call APIs, query databases, whatever
                you need.
              </p>
              <div className="bg-gray-900 rounded p-3">
                <code className="text-purple-400">
                  execute: async ({`{ location }`}) =&gt; {`{ ... }`}
                </code>
              </div>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg border-l-4 border-orange-500">
              <h4 className="text-orange-400 font-semibold mb-3 flex items-center">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm mr-3">
                  4
                </div>
                "How do I give it to my agent?"
              </h4>
              <p className="text-gray-300 mb-3">
                Add the tool to your agent's{" "}
                <span className="text-orange-400 font-mono">tools</span> array.
                The agent will automatically understand when and how to use it
                based on user input.
              </p>
              <div className="bg-gray-900 rounded p-3">
                <code className="text-orange-400">
                  tools: [getWeatherTool] // Agent now has superpowers
                </code>
              </div>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg border-l-4 border-red-500">
              <h4 className="text-red-400 font-semibold mb-3 flex items-center">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm mr-3">
                  5
                </div>
                "The magic happens automatically"
              </h4>
              <p className="text-gray-300 mb-3">
                VoltAgent handles everything: parsing user input, deciding which
                tool to use, calling your function, and formatting the response.
                You just write the business logic.
              </p>
              <div className="bg-gray-900 rounded p-3">
                <code className="text-red-400">
                  User: "Weather in NYC?" → Tool: get_weather() → Response!
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Testing in VoltOps */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Testing in VoltOps Console
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Now let's test your tool-powered agent in the VoltOps console.
          </p>

          <div className="bg-[#00d992]/10 border border-[#00d992]/20 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-[#00d992] mb-4">
              Step-by-Step Testing
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <span className="text-[#00d992] font-mono font-bold text-lg">
                  1.
                </span>
                <div>
                  <p className="text-gray-300 mb-2">
                    Update your code with the tool (above) and save the file
                  </p>
                  <p className="text-gray-400 text-sm">
                    Your agent will automatically reload with the new tool
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <span className="text-[#00d992] font-mono font-bold text-lg">
                  2.
                </span>
                <div>
                  <p className="text-gray-300 mb-2">
                    Go back to VoltOps Console:
                  </p>
                  <a
                    href="https://console.voltagent.dev"
                    target="_blank"
                    className="text-[#00d992] hover:underline"
                  >
                    console.voltagent.dev
                  </a>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <span className="text-[#00d992] font-mono font-bold text-lg">
                  3.
                </span>
                <div>
                  <p className="text-gray-300 mb-2">
                    Try these inputs to see your tool in action:
                  </p>
                  <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                    <div className="bg-gray-900 rounded p-2">
                      <code className="text-blue-400">
                        "What's the weather in New York?"
                      </code>
                    </div>
                    <div className="bg-gray-900 rounded p-2">
                      <code className="text-blue-400">
                        "Check weather in San Francisco"
                      </code>
                    </div>
                    <div className="bg-gray-900 rounded p-2">
                      <code className="text-blue-400">
                        "Is it sunny in Tokyo?"
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Demo GIF */}
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">
              See Your Tool in Action
            </h3>
            <p className="text-gray-300 mb-4">
              This is what happens when you ask your agent about weather:
            </p>
            <div className="rounded-lg overflow-hidden border border-gray-600">
              <img
                src="https://cdn.voltagent.dev/docs/tutorial/voltops-tool-demo.gif"
                alt="VoltAgent Tool Demo - Weather tool in action"
                className="w-full h-auto"
              />
            </div>
            <p className="text-gray-400 text-sm mt-3 text-center">
              Your agent now executes tools automatically and provides real data
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
            <h4 className="text-blue-400 font-semibold mb-2">
              Debug & Monitor
            </h4>
            <p className="text-gray-300 mb-3">
              In the VoltOps console, you'll see:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                <span className="text-gray-300">Tool execution logs</span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                <span className="text-gray-300">Agent reasoning process</span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                <span className="text-gray-300">Response time metrics</span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                <span className="text-gray-300">Error tracking</span>
              </div>
            </div>
          </div>
        </div>

        {/* The Transformation */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            The Transformation: From Chatbot to Agent
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Watch how your agent's behavior completely changes with just one
            tool.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-red-300 mb-4">
                Before (Useless Chatbot)
              </h3>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded p-3">
                  <div className="text-gray-400 text-sm">User:</div>
                  <div className="text-gray-300">
                    "What's the weather in NYC?"
                  </div>
                </div>
                <div className="bg-gray-800 rounded p-3">
                  <div className="text-gray-400 text-sm">Agent:</div>
                  <div className="text-red-300">
                    "I can't check current weather data. Try checking
                    weather.com or your local weather app."
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-green-300 mb-4">
                After (Real Agent)
              </h3>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded p-3">
                  <div className="text-gray-400 text-sm">User:</div>
                  <div className="text-gray-300">
                    "What's the weather in NYC?"
                  </div>
                </div>
                <div className="bg-gray-800 rounded p-3">
                  <div className="text-gray-400 text-sm">Agent:</div>
                  <div className="text-green-300">
                    "Let me check that for you... The current weather in New
                    York is 18°C with partly cloudy conditions."
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#00d992]/10 rounded-lg p-6 border border-[#00d992]/20">
            <h4 className="text-[#00d992] font-semibold mb-2">The Magic</h4>
            <p className="text-gray-300">
              Your agent now <strong>takes action</strong> instead of giving
              advice. It calls your{" "}
              <span className="text-[#00d992] font-mono">get_weather</span>{" "}
              function automatically and provides real data. This is the power
              of tools.
            </p>
          </div>
        </div>
      </div>
    </TutorialLayout>
  );
}
