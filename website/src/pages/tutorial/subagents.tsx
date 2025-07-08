import type React from "react";
import { TutorialLayout } from "../../components/tutorial/TutorialLayout";
import CodeBlock from "@theme/CodeBlock";
import { ColorModeProvider } from "@docusaurus/theme-common/internal";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function SubagentsTutorial() {
  return (
    <TutorialLayout
      currentStep={5}
      totalSteps={5}
      stepTitle="Subagents: Building Agent Teams"
      stepDescription="Create specialized agents that work together to solve complex problems"
      prevStepUrl="/tutorial/mcp"
    >
      <div className="space-y-20">
        {/* The Problem */}
        <div className="space-y-6">
          <h2 className="text-2xl landing-md:text-3xl font-bold text-white">
            The Problem: One Agent Can't Do Everything
          </h2>
          <p className="text-xs landing-md:text-base text-gray-300 leading-relaxed">
            You've built an agent with tools and memory, but as requirements
            grow, you realize one agent trying to do everything becomes a
            nightmare to maintain.
          </p>

          <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-4 landing-md:gap-6">
            <div className="border-solid border-red-500 rounded-lg p-4 landing-md:p-6 ">
              <h3 className="text-lg landing-md:text-xl font-semibold text-red-500 mb-3 landing-md:mb-4">
                Single Agent Problems
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <XMarkIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-red-500 mt-1" />
                  <span className="text-xs landing-md:text-base text-gray-300">
                    Conflicting instructions
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <XMarkIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-red-500 mt-1" />
                  <span className="text-xs landing-md:text-base text-gray-300">
                    Too many tools to manage
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <XMarkIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-red-500 mt-1" />
                  <span className="text-xs landing-md:text-base text-gray-300">
                    Mixed responsibilities
                  </span>
                </div>
              </div>
            </div>

            <div className="border-solid border-emerald-500 rounded-lg p-4 landing-md:p-6 ">
              <h3 className="text-lg landing-md:text-xl font-semibold text-emerald-500 mb-3 landing-md:mb-4">
                Subagent Benefits
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-emerald-500 mt-1" />
                  <span className="text-xs landing-md:text-base text-gray-300">
                    Specialized expertise
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-emerald-500 mt-1" />
                  <span className="text-xs landing-md:text-base text-gray-300">
                    Clean separation of concerns
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-emerald-500 mt-1" />
                  <span className="text-xs landing-md:text-base text-gray-300">
                    Easier to maintain and debug
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Simple Example */}
        <div className="space-y-6">
          <h2 className="text-2xl landing-md:text-3xl font-bold text-white">
            Simple Example: Story Writing & Translation Team
          </h2>
          <p className="text-xs landing-md:text-base text-gray-300 leading-relaxed">
            Let's build a creative team: one agent writes stories, another
            translates them. Much simpler than customer support!
          </p>

          <ColorModeProvider>
            <CodeBlock language="typescript" title="src/index.ts">
              {`import { VoltAgent, Agent, createTool } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Story Writer Agent
const writerAgent = new Agent({
  name: "writer",
  instructions: \`You are a creative story writer. You write engaging short stories based on user requests.
  
  Keep stories between 2-3 paragraphs.
  Make them interesting and creative.
  Always include vivid descriptions and engaging characters.\`,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [
    createTool({
      name: "save_story",
      description: "Save a completed story",
      parameters: z.object({
        title: z.string().describe("Title of the story"),
        content: z.string().describe("The story content"),
        genre: z.string().describe("Genre of the story")
      }),
      execute: async ({ title, content, genre }) => {
        console.log("Saving story:", { title, genre });
        return { 
          storyId: "STORY-" + Date.now(), 
          status: "saved",
          wordCount: content.split(' ').length
        };
      },
    })
  ]
});

// Translator Agent  
const translatorAgent = new Agent({
  name: "translator",
  instructions: \`You are a professional translator. You translate text into multiple languages:
  - German (Deutsch)
  - Japanese (日本語) 
  - Italian (Italiano)
  
  Provide accurate, natural translations that maintain the story's tone and meaning.\`,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [
    createTool({
      name: "save_translation",
      description: "Save a translation",
      parameters: z.object({
        originalText: z.string().describe("Original text"),
        translatedText: z.string().describe("Translated text"),
        language: z.string().describe("Target language")
      }),
      execute: async ({ originalText, translatedText, language }) => {
        console.log("Saving translation to", language);
        return { 
          translationId: "TRANS-" + Date.now(),
          language: language,
          status: "saved"
        };
      },
    })
  ]
});

// Creative Director - Coordinates the team
const creativeDirector = new Agent({
  name: "creative-director", 
  instructions: \`You are a creative director managing a story writing and translation team.

When users request stories:
1. First use the WRITER agent to create the story
2. Then use the TRANSLATOR agent to translate it into German, Japanese, and Italian
3. Present the original story and all translations

ALWAYS delegate - don't write stories or translate yourself.
Your job is coordination only.

Example flow:
User: "Write a story about a magic cat"
→ Use writer agent to create story
→ Use translator agent for German version  
→ Use translator agent for Japanese version
→ Use translator agent for Italian version
→ Present all versions to user\`,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [writerAgent, translatorAgent],
});

new VoltAgent({
  agents: {
    "creative-director": creativeDirector,
    writer: writerAgent,
    translator: translatorAgent,
  },
});`}
            </CodeBlock>
          </ColorModeProvider>
        </div>

        {/* How It Works */}
        <div className="space-y-6">
          <h2 className="text-2xl landing-md:text-3xl font-bold text-white">
            How Subagents Work
          </h2>
          <p className="text-xs landing-md:text-base text-gray-300 leading-relaxed">
            The supervisor agent automatically knows how to use subagents based
            on the conversation context. Here's what happens:
          </p>

          <div className=" ">
            <h3 className="text-lg landing-md:text-xl font-semibold text-white mb-3 landing-md:mb-4">
              Creative Workflow
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-6 h-6 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center  text-xs landing-md:text-sm font-bold">
                  1
                </div>
                <div>
                  <strong className="text-white text-xs landing-md:text-base">
                    User:
                  </strong>
                  <span className="text-gray-300 ml-2 text-xs landing-md:text-base">
                    "Write a story about a magical forest"
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-6 h-6 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center  text-xs landing-md:text-sm font-bold">
                  2
                </div>
                <div>
                  <strong className="text-white text-xs landing-md:text-base">
                    Creative Director:
                  </strong>
                  <span className="text-gray-300 ml-2 text-xs landing-md:text-base">
                    "I'll coordinate our team to create this story and translate
                    it"
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-6 h-6 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center  text-xs landing-md:text-sm font-bold">
                  3
                </div>
                <div>
                  <strong className="text-white text-xs landing-md:text-base">
                    Writer Agent:
                  </strong>
                  <span className="text-gray-300 ml-2 text-xs landing-md:text-base">
                    Creates an engaging story about magical forest and saves it
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-6 h-6 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center  text-xs landing-md:text-sm font-bold">
                  4
                </div>
                <div>
                  <strong className="text-white text-xs landing-md:text-base">
                    Translator Agent:
                  </strong>
                  <span className="text-gray-300 ml-2 text-xs landing-md:text-base">
                    Translates the story into German, Japanese, and Italian
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-6 h-6 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center  text-xs landing-md:text-sm font-bold">
                  5
                </div>
                <div>
                  <strong className="text-white text-xs landing-md:text-base">
                    Creative Director:
                  </strong>
                  <span className="text-gray-300 ml-2 text-xs landing-md:text-base">
                    Presents the original story and all 3 translations to user
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testing in VoltOps */}
        <div className="space-y-6">
          <h2 className="text-2xl landing-md:text-3xl font-bold text-white">
            Testing Your Agent Team in VoltOps
          </h2>
          <p className="text-xs landing-md:text-base text-gray-300 leading-relaxed">
            Let's test your customer support team in VoltOps console to see how
            subagents coordinate automatically.
          </p>

          <div className=" ">
            <h3 className="text-lg landing-md:text-xl font-semibold text-[#00d992] mb-4">
              Step-by-Step Testing
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 landing-md:space-x-4">
                <div className="flex-shrink-0 w-7 h-7 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center">
                  <span className=" font-bold text-xs landing-md:text-sm">
                    1
                  </span>
                </div>
                <div>
                  <p className="text-gray-300 mb-2 text-xs landing-md:text-base">
                    Update your code with the story writing team (above) and
                    save the file
                  </p>
                  <p className="text-gray-400 text-xs landing-md:text-base">
                    Your agents will automatically reload with the new creative
                    team configuration
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 landing-md:space-x-4">
                <div className="flex-shrink-0 w-7 h-7 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center">
                  <span className=" font-bold text-xs landing-md:text-base">
                    2
                  </span>
                </div>
                <div>
                  <p className="text-gray-300 mb-2 text-xs landing-md:text-base">
                    Go to VoltOps Console and set userId:
                  </p>
                  <div className="space-y-2">
                    <a
                      href="https://console.voltagent.dev"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#00d992] hover:underline text-xs landing-md:text-base"
                    >
                      console.voltagent.dev
                    </a>
                    <div className="bg-gray-800 rounded p-2">
                      <code className="text-[#00d992] text-xs">
                        userId: "writer-123"
                      </code>
                      <br />
                      <code className="text-[#00d992] text-xs">
                        conversationId: "creative-session"
                      </code>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-3 landing-md:space-x-4">
                <div className="flex-shrink-0 w-7 h-7 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center">
                  <span className=" font-bold text-xs landing-md:text-base">
                    3
                  </span>
                </div>
                <div>
                  <p className="text-gray-300 mb-2 text-xs landing-md:text-base">
                    Try these test scenarios to see immediate subagent routing:
                  </p>
                  <div className=" my-2 flex border-solid border border-gray-500/30 flex-col items-start rounded-lg p-2 landing-md:p-3">
                    <div className="rounded p-1 landing-md:p-2 my-1 landing-md:my-2 w-full">
                      <div className="text-emerald-400 text-xs mb-1 landing-md:base">
                        Story Request (Should coordinate writer + translator):
                      </div>
                      <code className="text-gray-300 text-xs landing-md:text-base break-all">
                        "Write a story about a magical cat"
                      </code>
                      <div className="text-gray-500 text-xs mt-1">
                        Expected: Writer creates story, translator translates to
                        3 languages
                      </div>
                    </div>
                    <div className="rounded p-1 landing-md:p-2 my-1 landing-md:my-2 w-full">
                      <div className="text-emerald-400 text-xs mb-1 landing-md:base">
                        Simple Story Request:
                      </div>
                      <code className="text-gray-300 text-xs landing-md:text-base break-all">
                        "Tell me a story about space adventure"
                      </code>
                      <div className="text-gray-500 text-xs mt-1">
                        Expected: Complete story + translations workflow
                      </div>
                    </div>
                    <div className="rounded p-1 landing-md:p-2 my-1 landing-md:my-2 w-full">
                      <div className="text-emerald-400 text-xs mb-1 landing-md:base">
                        Themed Story Request:
                      </div>
                      <code className="text-gray-300 text-xs landing-md:text-base break-all">
                        "Create a mystery story set in Victorian London"
                      </code>
                      <div className="text-gray-500 text-xs mt-1">
                        Expected: Themed story creation + multilingual output
                      </div>
                    </div>
                  </div>
                  <div className="rounded p-3 mt-3">
                    <div className="text-emerald-400 font-semibold text-xs landing-md:text-base mb-1">
                      ✨ What You'll See:
                    </div>
                    <div className="text-gray-300 text-xs">
                      The creative director will coordinate: Original English
                      story + German + Japanese + Italian translations!
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Demo GIF */}
          <div className=" rounded-lg p-4 landing-md:p-6 border border-gray-700">
            <h3 className="text-lg landing-md:text-xl font-semibold text-white mb-3 landing-md:mb-4">
              See Subagents in Action
            </h3>
            <p className="text-gray-300 mb-3 landing-md:mb-4 text-xs landing-md:text-sm">
              Watch how the creative director coordinates the writer and
              translator agents:
            </p>
            <div className="rounded-lg overflow-hidden border border-gray-600">
              <img
                src="https://cdn.voltagent.dev/docs/tutorial/subagent-demo.gif"
                alt="VoltOps Subagents Demo - Story writing and translation workflow"
                className="w-full h-auto"
              />
            </div>
            <p className="text-gray-400 text-xs landing-md:text-sm mt-2 landing-md:mt-3 text-center">
              Creative coordination: Story creation followed by multilingual
              translation
            </p>
          </div>

          <div className=" ">
            <h4 className="text-emerald-400 font-semibold mb-2 text-xs landing-md:text-base">
              Debug & Monitor Creative Workflow
            </h4>
            <p className="text-gray-300 mb-3 text-xs landing-md:text-base">
              In the VoltOps console, you'll see the complete creative process:
            </p>
            <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-3 landing-md:gap-4">
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-gray-300 text-xs landing-md:text-base">
                  Creative director coordination
                </span>
              </div>
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-gray-300 text-xs landing-md:text-base">
                  Story creation and saving
                </span>
              </div>
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-gray-300 text-xs landing-md:text-base">
                  Translation workflow tracking
                </span>
              </div>
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-gray-300 text-xs landing-md:text-base">
                  Multi-language output generation
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Tips */}
        <div className="space-y-6">
          <h2 className="text-2xl landing-md:text-3xl font-bold text-white">
            Pro Tips: Supercharge Your Creative Director
          </h2>
          <p className="text-xs landing-md:text-base text-gray-300 leading-relaxed">
            Here are some powerful tricks from the VoltAgent docs to make your
            subagents even better:
          </p>

          <div className="space-y-4 landing-md:space-y-6">
            {/* Tip 1: Custom Guidelines */}
            <div className=" rounded-lg p-4 landing-md:p-6 border-solid border border-emerald-500">
              <h3 className="text-lg landing-md:text-xl font-semibold text-emerald-500 mb-3 landing-md:mb-4">
                Custom Guidelines
              </h3>
              <p className="text-gray-300 mb-3 text-xs landing-md:text-sm">
                Add custom rules to your creative director's behavior:
              </p>
              <ColorModeProvider>
                <CodeBlock language="typescript" title="Add Custom Rules">
                  {`const creativeDirector = new Agent({
  name: "creative-director",
  subAgents: [writerAgent, translatorAgent],
  
  // Add custom guidelines
  supervisorConfig: {
    customGuidelines: [
      "Always ask user about preferred story genre first",
      "Include word count in final response", 
      "Thank the team members by name",
      "Offer to create illustrations for stories"
    ]
  }
});`}
                </CodeBlock>
              </ColorModeProvider>
            </div>

            {/* Tip 2: Monitor Delegation */}
            <div className=" rounded-lg p-4 landing-md:p-6 border-solid border border-emerald-500">
              <h3 className="text-lg landing-md:text-xl font-semibold text-emerald-500 mb-3 landing-md:mb-4">
                Monitor Delegation
              </h3>
              <p className="text-gray-300 mb-3 text-xs landing-md:text-sm">
                See exactly when tasks are handed off between agents:
              </p>
              <ColorModeProvider>
                <CodeBlock language="typescript" title="Track Handoffs">
                  {`const creativeDirector = new Agent({
  name: "creative-director", 
  subAgents: [writerAgent, translatorAgent],
  
  // Monitor delegation flow
  hooks: {
    onHandoff: ({ agent, source }) => {
      console.log(\`\${source.name} → \${agent.name}\`);
      // Output: "creative-director → writer"
      // Output: "creative-director → translator"
    }
  }
});`}
                </CodeBlock>
              </ColorModeProvider>
            </div>

            {/* Tip 3: Control Steps */}
            <div className=" rounded-lg p-4 landing-md:p-6 border-solid border border-emerald-500">
              <h3 className="text-lg landing-md:text-xl font-semibold text-emerald-500 mb-3 landing-md:mb-4">
                Control Workflow Steps
              </h3>
              <p className="text-gray-300 mb-3 text-xs landing-md:text-sm">
                Prevent infinite loops and control complexity:
              </p>
              <ColorModeProvider>
                <CodeBlock language="typescript" title="Step Limits">
                  {`// Global step limit for all subagents
const creativeDirector = new Agent({
  name: "creative-director",
  subAgents: [writerAgent, translatorAgent],
  maxSteps: 15  // Prevents runaway workflows
});

// Or per-request control
const response = await creativeDirector.generateText(
  "Write a story about time travel", 
  { 
    maxSteps: 8,  // Override for this request
    userId: "user123" 
  }
);`}
                </CodeBlock>
              </ColorModeProvider>
            </div>

            {/* Tip 4: Dynamic Teams */}
            <div className=" rounded-lg p-4 landing-md:p-6 border-solid border border-emerald-500">
              <h3 className="text-lg landing-md:text-xl font-semibold text-emerald-500 mb-3 landing-md:mb-4">
                Dynamic Team Management
              </h3>
              <p className="text-gray-300 mb-3 text-xs landing-md:text-sm">
                Add or remove team members on the fly:
              </p>
              <ColorModeProvider>
                <CodeBlock
                  language="typescript"
                  title="Dynamic Teams & createSubAgent"
                >
                  {`import { createSubAgent } from "@voltagent/core";

// Method 1: Traditional subAgent array
const creativeDirector = new Agent({
  name: "creative-director",
  subAgents: [writerAgent, translatorAgent]
});

// Method 2: Using createSubAgent function (more powerful!)
const managerAgent = new Agent({
  name: "project-manager",
  instructions: "Coordinate creative projects and manage team workflows",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [
    // This creates a tool that can delegate to writer
    createSubAgent(writerAgent),
    // This creates a tool that can delegate to translator  
    createSubAgent(translatorAgent),
    // Add other business tools
    createTool({
      name: "schedule_meeting",
      description: "Schedule team meetings",
      parameters: z.object({
        time: z.string(),
        attendees: z.array(z.string())
      }),
      execute: async ({ time, attendees }) => {
        return { meetingId: "MTG-" + Date.now(), scheduled: true };
      }
    })
  ]
});

// Dynamic team management
const illustratorAgent = new Agent({
  name: "illustrator", 
  instructions: "Create visual content and illustrations"
});

// Add new team member dynamically
managerAgent.addTool(createSubAgent(illustratorAgent));

// Remove team member
managerAgent.removeTool("illustrator");`}
                </CodeBlock>
              </ColorModeProvider>
            </div>
          </div>

          <div className=" border-solid border border-yellow-500 rounded-lg p-4 landing-md:p-6">
            <h4 className="text-yellow-400 font-semibold mb-3 text-xs landing-md:text-base">
              Pro Tip: Combine All Tricks
            </h4>
            <p className="text-gray-300 mb-3 text-xs landing-md:text-base">
              Use custom guidelines + monitoring + step control for
              production-ready agent teams:
            </p>
            <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-3 landing-md:gap-4">
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-gray-300 text-xs landing-md:text-base">
                  Guidelines ensure consistent behavior
                </span>
              </div>
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-gray-300 text-xs landing-md:text-base">
                  Hooks provide debugging visibility
                </span>
              </div>
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-gray-300 text-xs landing-md:text-base">
                  Step limits prevent runaway costs
                </span>
              </div>
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-gray-300 text-xs landing-md:text-base">
                  Dynamic teams adapt to requirements
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Context-Aware Tools */}
        <div className="space-y-6">
          <h2 className="text-2xl landing-md:text-3xl font-bold text-white">
            Context-Aware Tools: Solving the Parameter Problem
          </h2>
          <p className="text-xs landing-md:text-base text-gray-300 leading-relaxed">
            Notice how our billing tools don't ask for email addresses? This is
            a crucial UX principle: tools should use context (userId) instead of
            asking users for information we already have.
          </p>

          <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-4 landing-md:gap-6">
            <div className="border-solid border-red-500 rounded-lg p-4 landing-md:p-6 ">
              <h3 className="text-lg landing-md:text-xl font-semibold text-red-500 mb-3 landing-md:mb-4">
                ❌ Bad UX: Asking for Known Info
              </h3>
              <div className="space-y-3 text-xs landing-md:text-sm">
                <div className="border border-solid border-gray-500/30 rounded p-2">
                  <div className="text-gray-400">User:</div>
                  <div className="text-gray-300">
                    "I need to cancel my subscription"
                  </div>
                </div>
                <div className="border border-solid border-gray-500/30 rounded p-2">
                  <div className="text-gray-400">Bad Agent:</div>
                  <div className="text-red-500">
                    "What's your email address?"
                  </div>
                </div>
                <div className="text-gray-400">
                  User thinks: "You should know this already!"
                </div>
              </div>
            </div>

            <div className="border-solid border-emerald-500 rounded-lg p-4 landing-md:p-6 ">
              <h3 className="text-lg landing-md:text-xl font-semibold text-emerald-500 mb-3 landing-md:mb-4">
                ✅ Good UX: Using Context
              </h3>
              <div className="space-y-3 text-xs landing-md:text-sm">
                <div className="border border-solid border-gray-500/30 rounded p-2">
                  <div className="text-gray-400">User:</div>
                  <div className="text-gray-300">
                    "I need to cancel my subscription"
                  </div>
                </div>
                <div className="border border-solid border-gray-500/30 rounded p-2">
                  <div className="text-gray-400">Smart Agent:</div>
                  <div className="text-emerald-500">
                    "I found your Pro plan subscription. Would you like me to
                    process the cancellation?"
                  </div>
                </div>
                <div className="text-gray-400">
                  User thinks: "This is smart and convenient!"
                </div>
              </div>
            </div>
          </div>

          <div className=" border-solid border border-emerald-500 rounded-lg p-4 landing-md:p-6">
            <h4 className="text-emerald-400 font-semibold mb-3 text-xs landing-md:text-base">
              How Context-Aware Tools Work
            </h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5" />
                <span className="text-gray-300 text-xs landing-md:text-base">
                  <strong>userId</strong> is automatically passed to all tool
                  executions
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5" />
                <span className="text-gray-300 text-xs landing-md:text-base">
                  Tools use{" "}
                  <code className="bg-gray-800 px-1 rounded">
                    context.userId
                  </code>{" "}
                  to lookup user data
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5" />
                <span className="text-gray-300 text-xs landing-md:text-base">
                  No need to ask users for information we already have
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5" />
                <span className="text-gray-300 text-xs landing-md:text-base">
                  Much better user experience and faster resolution
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="space-y-6">
          <h2 className="text-2xl landing-md:text-3xl font-bold text-white">
            Best Practices for Subagents
          </h2>
          <p className="text-xs landing-md:text-base text-gray-300 leading-relaxed">
            Here are the key principles for designing effective agent teams:
          </p>

          <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-4 landing-md:gap-6">
            <div className="border-solid border-emerald-500 rounded-lg p-4 landing-md:p-6 ">
              <h3 className="text-lg landing-md:text-xl font-semibold text-emerald-500 mb-3 landing-md:mb-4">
                Do This
              </h3>
              <div className="space-y-3 text-xs landing-md:text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5" />
                  <span className="text-gray-300">
                    <strong>Single Responsibility:</strong> Each agent should
                    have one clear job
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5" />
                  <span className="text-gray-300">
                    <strong>Clear Instructions:</strong> Define exactly what
                    each agent does
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5" />
                  <span className="text-gray-300">
                    <strong>Proper Tools:</strong> Give agents only the tools
                    they need
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5" />
                  <span className="text-gray-300">
                    <strong>Logical Hierarchy:</strong> Supervisor coordinates,
                    specialists execute
                  </span>
                </div>
              </div>
            </div>

            <div className="border-solid border-red-500 rounded-lg p-4 landing-md:p-6 ">
              <h3 className="text-lg landing-md:text-xl font-semibold text-red-500 mb-3 landing-md:mb-4">
                Avoid This
              </h3>
              <div className="space-y-3 text-xs landing-md:text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5" />
                  <span className="text-gray-300">
                    <strong>Overlapping Roles:</strong> Agents with similar or
                    conflicting jobs
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5" />
                  <span className="text-gray-300">
                    <strong>Too Many Layers:</strong> Agents managing other
                    agents managing agents
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5" />
                  <span className="text-gray-300">
                    <strong>Circular Dependencies:</strong> Agents that depend
                    on each other
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5" />
                  <span className="text-gray-300">
                    <strong>Generic Agents:</strong> Agents that try to do
                    everything
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testing Your Team */}
        <div className="space-y-6">
          <h2 className="text-2xl landing-md:text-3xl font-bold text-white">
            Testing Your Agent Team
          </h2>
          <p className="text-xs landing-md:text-base text-gray-300 leading-relaxed">
            Once you've built your agent team, test it with realistic scenarios
            to make sure the coordination works smoothly.
          </p>

          <ColorModeProvider>
            <CodeBlock language="typescript" title="test-creative-team.ts">
              {`// Test the creative team
const testCreativeTeam = async () => {
  console.log("Testing creative writing team...");
  
  // Scenario 1: Simple story request
  const magicalStory = await creativeDirector.generateText(
    "Write a story about a magical cat",
    { userId: "writer123" }
  );
  
  // Scenario 2: Themed story
  const mysteryStory = await creativeDirector.generateText(
    "Create a mystery story set in Victorian London",
    { userId: "writer123" }
  );
  
  // Scenario 3: Adventure story
  const spaceAdventure = await creativeDirector.generateText(
    "Tell me an exciting space adventure story",
    { userId: "writer123" }
  );
  
  console.log("All creative scenarios completed!");
  console.log("Each story created in English + German + Japanese + Italian!");
};

// Test individual agents
const testIndividualAgents = async () => {
  // Test writer directly
  const story = await writerAgent.generateText(
    "Write a short story about friendship",
    { userId: "writer123" }
  );
  
  // Test translator directly  
  const translation = await translatorAgent.generateText(
    "Translate this to German: 'Once upon a time, there was a brave knight.'",
    { userId: "writer123" }
  );
};

// Run tests
testCreativeTeam();
testIndividualAgents();`}
            </CodeBlock>
          </ColorModeProvider>
        </div>

        {/* REST API Usage */}
        <div className="space-y-6">
          <h2 className="text-2xl landing-md:text-3xl font-bold text-white">
            Using Creative Team via REST API
          </h2>
          <p className="text-xs landing-md:text-base text-gray-300 leading-relaxed">
            In production, you can integrate your creative team into apps or
            websites. Here's how to call your creative director via REST API to
            get stories with translations.
          </p>

          <ColorModeProvider>
            <CodeBlock language="bash" title="Creative Team API Calls">
              {`# Story request - creative director coordinates writer + translator
curl -X POST http://localhost:3141/agents/creative-director/text \\
     -H "Content-Type: application/json" \\
     -d '{
       "input": "Write a story about a magical cat",
       "options": {
         "userId": "writer-123",
         "conversationId": "creative-session-001"
       }
     }'

# Themed story request - full creative workflow
curl -X POST http://localhost:3141/agents/creative-director/text \\
     -H "Content-Type: application/json" \\
     -d '{
       "input": "Create a mystery story set in Victorian London",
       "options": {
         "userId": "writer-123", 
         "conversationId": "creative-session-001"
       }
     }'

# Adventure story - writer creates, translator translates to 3 languages
curl -X POST http://localhost:3141/agents/creative-director/text \\
     -H "Content-Type: application/json" \\
     -d '{
       "input": "Tell me an exciting space adventure story",
       "options": {
         "userId": "writer-123",
         "conversationId": "creative-session-001"
       }
     }'`}
            </CodeBlock>
          </ColorModeProvider>

          <div className=" ">
            <h4 className="text-emerald-400 font-semibold mb-3 text-xs landing-md:text-base">
              The Power of Creative Team Coordination
            </h4>
            <p className="text-gray-300 mb-3 text-xs landing-md:text-sm">
              With this creative team setup:
            </p>
            <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-3 landing-md:gap-4">
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-gray-300 text-xs landing-md:text-sm">
                  One request → Story + 3 translations
                </span>
              </div>
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-gray-300 text-xs landing-md:text-sm">
                  Automatic workflow coordination
                </span>
              </div>
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-gray-300 text-xs landing-md:text-sm">
                  Specialized agents for quality output
                </span>
              </div>
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-gray-300 text-xs landing-md:text-sm">
                  Perfect for content generation apps
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="space-y-6">
          <h2 className="text-2xl landing-md:text-3xl font-bold text-white">
            What's Next?
          </h2>
          <p className="text-xs landing-md:text-base text-gray-300 leading-relaxed">
            Congratulations! You've built a complete AI agent system with:
          </p>

          <div className=" rounded-lg p-4 landing-md:p-6 border-solid border border-gray-700">
            <h3 className="text-lg landing-md:text-xl font-semibold text-white mb-3 landing-md:mb-4">
              Your Agent Journey
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                <span className="text-gray-300 text-xs landing-md:text-sm">
                  <strong>Step 1:</strong> Built your first agent
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                <span className="text-gray-300 text-xs landing-md:text-sm">
                  <strong>Step 2:</strong> Added tools to make it useful
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                <span className="text-gray-300 text-xs landing-md:text-sm">
                  <strong>Step 3:</strong> Implemented memory for conversations
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                <span className="text-gray-300 text-xs landing-md:text-sm">
                  <strong>Step 4:</strong> Connected to external systems with
                  MCP
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                <span className="text-gray-300 text-xs landing-md:text-sm">
                  <strong>Step 5:</strong> Created specialized agent teams
                </span>
              </div>
            </div>
          </div>

          <div className="border-solid border border-blue-500/20 rounded-lg p-4 landing-md:p-6">
            <h4 className="text-emerald-400 font-semibold mb-2 text-xs landing-md:text-base">
              Ready to Build Something Amazing?
            </h4>
            <p className="text-gray-300 mb-4 text-xs landing-md:text-sm">
              You now have all the tools to build production-ready AI agents.
              Whether you're creating a customer support system, content
              creation team, or something completely new, you're ready to go.
            </p>
            <div className="flex flex-col landing-md:flex-row gap-3 landing-md:gap-4">
              <a
                href="/docs"
                className="inline-flex items-center px-4 py-2 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 no-underline rounded-lg hover:bg-blue-700 transition-colors text-xs landing-md:text-sm justify-center"
              >
                Read Full Documentation
              </a>
              <a
                href="https://github.com/voltagent/voltagent"
                className="inline-flex items-center px-4 py-2 border no-underline border-solid border-amber-500 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors text-xs landing-md:text-sm justify-center"
              >
                ⭐ Star on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </TutorialLayout>
  );
}
