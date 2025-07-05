import type React from "react";
import { TutorialLayout } from "../../components/tutorial/TutorialLayout";
import CodeBlock from "@theme/CodeBlock";
import { ColorModeProvider } from "@docusaurus/theme-common/internal";

export default function TutorialSubagents() {
  return (
    <TutorialLayout
      currentStep={5}
      totalSteps={5}
      stepTitle="Subagents: Multi-Agent Workflows"
      stepDescription="Build complex systems where agents coordinate to solve bigger problems"
      prevStepUrl="/tutorial/mcp"
    >
      <div className="space-y-8">
        {/* What Are Subagents? */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">What Are Subagents?</h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Subagents are specialized agents that work together under a
            coordinator (supervisor) agent. Think of it like a team where each
            member has specific expertise.
          </p>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">
              Real-World Analogy
            </h3>
            <p className="text-gray-300">
              Imagine a software company: You have a Project Manager who
              coordinates between a Frontend Developer, Backend Developer, and
              QA Tester. Each has their role, but they work together to deliver
              the project.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-red-300 mb-4">
                Single Agent Approach
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-red-400 mt-1">❌</span>
                  <span className="text-gray-300">
                    One agent tries to do everything
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-400 mt-1">❌</span>
                  <span className="text-gray-300">
                    Jack of all trades, master of none
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-400 mt-1">❌</span>
                  <span className="text-gray-300">
                    Difficult to maintain and debug
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-green-300 mb-4">
                Multi-Agent Approach
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 mt-1">✅</span>
                  <span className="text-gray-300">
                    Each agent specialized for specific tasks
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 mt-1">✅</span>
                  <span className="text-gray-300">
                    Better performance and reliability
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 mt-1">✅</span>
                  <span className="text-gray-300">
                    Easier to test and maintain
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real Example: DevOps Team */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Real Example: DevOps Team
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Let's build a DevOps team where a supervisor coordinates between
            specialists.
          </p>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-blue-300 mb-4">
              The Team Structure
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  S
                </div>
                <div>
                  <strong className="text-blue-300">Supervisor Agent:</strong>
                  <p className="text-gray-300">
                    Coordinates the team, makes decisions, communicates with
                    users
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  C
                </div>
                <div>
                  <strong className="text-green-300">Code Analyzer:</strong>
                  <p className="text-gray-300">
                    Reviews code, finds bugs, suggests improvements
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  D
                </div>
                <div>
                  <strong className="text-purple-300">Deployment Agent:</strong>
                  <p className="text-gray-300">
                    Handles deployments, manages infrastructure
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  M
                </div>
                <div>
                  <strong className="text-orange-300">Monitor Agent:</strong>
                  <p className="text-gray-300">
                    Watches system health, alerts on issues
                  </p>
                </div>
              </div>
            </div>
          </div>

          <ColorModeProvider>
            <CodeBlock language="typescript" title="DevOps Team Implementation">
              {`import { VoltAgent, Agent, createTool } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Create specialized tools
const analyzeCodeTool = createTool({
  name: "analyze_code",
  description: "Analyze code for bugs and improvements",
  inputSchema: z.object({
    code: z.string(),
    language: z.string(),
  }),
  handler: async ({ code, language }) => {
    // Simulate code analysis
    const issues = [
      "Line 15: Potential null pointer exception",
      "Line 32: Consider using async/await instead of promises",
      "Line 45: Memory leak in event listener"
    ];
    return { issues, language, analyzed: true };
  },
});

const deployTool = createTool({
  name: "deploy_app",
  description: "Deploy application to production",
  inputSchema: z.object({
    version: z.string(),
    environment: z.string(),
  }),
  handler: async ({ version, environment }) => {
    // Simulate deployment
    return { 
      deployed: true, 
      version, 
      environment,
      url: \`https://app-\${version}.\${environment}.com\`
    };
  },
});

const monitorTool = createTool({
  name: "check_system_health",
  description: "Check system health and performance",
  inputSchema: z.object({
    service: z.string(),
  }),
  handler: async ({ service }) => {
    // Simulate monitoring
    return {
      service,
      status: "healthy",
      cpu: "45%",
      memory: "67%",
      uptime: "15 days",
    };
  },
});

// Create specialized agents
const codeAnalyzer = new Agent({
  name: "CodeAnalyzer",
  description: "Specialized in code analysis and review",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: \`You are a senior code reviewer. Your job is to:
  1. Analyze code for bugs, security issues, and performance problems
  2. Suggest improvements and best practices
  3. Provide clear, actionable feedback
  
  Be thorough but constructive in your analysis.\`,
  tools: [analyzeCodeTool],
});

const deploymentAgent = new Agent({
  name: "DeploymentAgent", 
  description: "Handles application deployments",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: \`You are a deployment specialist. Your job is to:
  1. Deploy applications safely to different environments
  2. Manage rollbacks if needed
  3. Ensure zero-downtime deployments
  
  Always verify deployment success before reporting completion.\`,
  tools: [deployTool],
});

const monitorAgent = new Agent({
  name: "MonitorAgent",
  description: "Monitors system health and performance", 
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: \`You are a system monitoring specialist. Your job is to:
  1. Monitor system health and performance
  2. Alert on issues and anomalies
  3. Provide recommendations for optimization
  
  Be proactive in identifying potential problems.\`,
  tools: [monitorTool],
});

// Create supervisor agent
const devOpsSupervisor = new Agent({
  name: "DevOpsSupervisor",
  description: "Coordinates DevOps team activities",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  instructions: \`You are a DevOps team leader. You coordinate between:
  - CodeAnalyzer: For code reviews and analysis
  - DeploymentAgent: For deployments and infrastructure
  - MonitorAgent: For system monitoring and health checks
  
  When users ask for help:
  1. Understand what they need
  2. Delegate tasks to the right specialist
  3. Coordinate between specialists if needed
  4. Provide a summary of the results
  
  Always explain what you're doing and why.\`,
  
  // Key: Define subagents
  subAgents: {
    codeAnalyzer,
    deploymentAgent,
    monitorAgent,
  },
});

// Start VoltAgent
new VoltAgent({
  agents: { devOpsSupervisor },
});`}
            </CodeBlock>
          </ColorModeProvider>
        </div>

        {/* How It Works */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">How It Works</h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            When you talk to the supervisor, it decides which specialists to
            involve.
          </p>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h4 className="text-white font-semibold mb-3">Example Workflow</h4>
            <div className="space-y-4">
              <div className="bg-blue-900/20 p-3 rounded border-l-4 border-blue-500">
                <strong className="text-blue-300">You:</strong>
                <p className="text-gray-300 mt-1">
                  "I need to review my React code and deploy it to staging"
                </p>
              </div>

              <div className="bg-green-900/20 p-3 rounded border-l-4 border-green-500">
                <strong className="text-green-300">Supervisor:</strong>
                <p className="text-gray-300 mt-1">
                  "I'll help you with that. Let me coordinate the team:"
                </p>
                <div className="text-gray-400 text-sm mt-2">
                  <div>🔧 Delegating to CodeAnalyzer for code review...</div>
                  <div>
                    🔧 Delegating to DeploymentAgent for staging deployment...
                  </div>
                </div>
              </div>

              <div className="bg-purple-900/20 p-3 rounded border-l-4 border-purple-500">
                <strong className="text-purple-300">CodeAnalyzer:</strong>
                <p className="text-gray-300 mt-1">
                  "I found 3 issues in your React code: [detailed analysis]"
                </p>
              </div>

              <div className="bg-orange-900/20 p-3 rounded border-l-4 border-orange-500">
                <strong className="text-orange-300">DeploymentAgent:</strong>
                <p className="text-gray-300 mt-1">
                  "Deployed to staging successfully:
                  https://app-v1.2.staging.com"
                </p>
              </div>

              <div className="bg-green-900/20 p-3 rounded border-l-4 border-green-500">
                <strong className="text-green-300">Supervisor:</strong>
                <p className="text-gray-300 mt-1">
                  "Complete! Code review found 3 issues to fix, and your app is
                  now live on staging. Want me to have the monitor agent check
                  the deployment health?"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Patterns */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">Advanced Patterns</h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            More sophisticated multi-agent architectures for complex workflows.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                Hierarchical Teams
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full"></div>
                  <span className="text-gray-300">
                    CEO Agent → Department Heads → Specialists
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full"></div>
                  <span className="text-gray-300">
                    Each level has specific responsibilities
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full"></div>
                  <span className="text-gray-300">
                    Scales to complex organizations
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                Pipeline Teams
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full"></div>
                  <span className="text-gray-300">
                    Data flows from agent to agent
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full"></div>
                  <span className="text-gray-300">
                    Each agent processes and passes on
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full"></div>
                  <span className="text-gray-300">
                    Perfect for content creation workflows
                  </span>
                </div>
              </div>
            </div>
          </div>

          <ColorModeProvider>
            <CodeBlock language="typescript" title="Content Creation Pipeline">
              {`// Content Creation Pipeline Example
const researchAgent = new Agent({
  name: "ResearchAgent",
  description: "Researches topics and gathers information",
  // ... config
});

const writerAgent = new Agent({
  name: "WriterAgent", 
  description: "Writes articles based on research",
  // ... config
});

const editorAgent = new Agent({
  name: "EditorAgent",
  description: "Edits and polishes written content",
  // ... config
});

const publisherAgent = new Agent({
  name: "PublisherAgent",
  description: "Formats and publishes content",
  // ... config
});

// Pipeline Supervisor
const contentPipeline = new Agent({
  name: "ContentPipeline",
  description: "Manages content creation from research to publication",
  instructions: \`You manage a content creation pipeline:
  1. ResearchAgent: Gathers information and sources
  2. WriterAgent: Creates first draft from research
  3. EditorAgent: Refines and polishes the draft
  4. PublisherAgent: Formats and publishes final content
  
  Coordinate the pipeline to ensure quality at each step.\`,
  
  subAgents: {
    researchAgent,
    writerAgent,
    editorAgent,
    publisherAgent,
  },
});`}
            </CodeBlock>
          </ColorModeProvider>
        </div>

        {/* Best Practices */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">Best Practices</h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Guidelines for building effective multi-agent systems.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-green-300 mb-4">
                ✅ Do This
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 mt-1">•</span>
                  <span className="text-gray-300">
                    Give each agent a clear, specific role
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 mt-1">•</span>
                  <span className="text-gray-300">
                    Make the supervisor's instructions clear
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 mt-1">•</span>
                  <span className="text-gray-300">
                    Test each agent individually first
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 mt-1">•</span>
                  <span className="text-gray-300">
                    Use different models for different tasks
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-red-300 mb-4">
                ❌ Avoid This
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-red-400 mt-1">•</span>
                  <span className="text-gray-300">
                    Creating too many agents (start simple)
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-400 mt-1">•</span>
                  <span className="text-gray-300">
                    Unclear responsibilities between agents
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-400 mt-1">•</span>
                  <span className="text-gray-300">
                    Infinite loops between agents
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-400 mt-1">•</span>
                  <span className="text-gray-300">
                    No error handling or fallbacks
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Considerations */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">Performance & Cost</h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Multi-agent systems can be expensive. Here's how to optimize.
          </p>

          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-yellow-300 mb-4">
              Cost Optimization Tips
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-yellow-400 mt-1">💡</span>
                <span className="text-gray-300">
                  Use cheaper models (gpt-4o-mini) for specialists
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-yellow-400 mt-1">💡</span>
                <span className="text-gray-300">
                  Reserve expensive models (gpt-4o) for supervisors
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-yellow-400 mt-1">💡</span>
                <span className="text-gray-300">
                  Set maxSteps to prevent runaway costs
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-yellow-400 mt-1">💡</span>
                <span className="text-gray-300">
                  Use memory to avoid re-processing
                </span>
              </div>
            </div>
          </div>

          <ColorModeProvider>
            <CodeBlock
              language="typescript"
              title="Optimized Agent Configuration"
            >
              {`// Supervisor: Expensive model for coordination
const supervisor = new Agent({
  name: "Supervisor",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"), // Expensive but smart
  maxSteps: 10, // Limit iterations
  // ... config
});

// Specialists: Cheaper models for specific tasks
const specialist = new Agent({
  name: "Specialist",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"), // Cheaper but effective
  maxSteps: 5, // Lower limits for specialists
  // ... config
});

// Use memory to cache results
const options = {
  userId: "user-123",
  conversationId: "devops-session-1",
  maxSteps: 8, // Override default if needed
};`}
            </CodeBlock>
          </ColorModeProvider>
        </div>

        {/* Production Deployment */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Production Deployment
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Considerations for deploying multi-agent systems in production.
          </p>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">
              Production Checklist
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input type="checkbox" className="mt-1" />
                <span className="text-gray-300">
                  Error handling and fallbacks for each agent
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <input type="checkbox" className="mt-1" />
                <span className="text-gray-300">
                  Logging and monitoring for debugging
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <input type="checkbox" className="mt-1" />
                <span className="text-gray-300">
                  Rate limiting and cost controls
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <input type="checkbox" className="mt-1" />
                <span className="text-gray-300">
                  Graceful degradation when agents fail
                </span>
              </div>
              <div className="flex items-start space-x-3">
                <input type="checkbox" className="mt-1" />
                <span className="text-gray-300">
                  Load testing with realistic workflows
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Hands-on Exercise */}
        <div className="bg-[#00d992]/10 border border-[#00d992]/20 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="w-6 h-6 bg-[#00d992] rounded-lg mt-1"></div>
            <div>
              <h4 className="text-xl font-semibold text-[#00d992] mb-2">
                Final Challenge
              </h4>
              <p className="text-gray-300 mb-3">
                Build your own multi-agent system:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-300 ml-4">
                <li>Copy the DevOps team code above</li>
                <li>
                  Test in VoltOps: "I need to deploy my new feature to staging"
                </li>
                <li>Watch how the supervisor coordinates the team</li>
                <li>Try: "Check the health of my production app"</li>
                <li>Experiment with different team compositions</li>
              </ol>
              <div className="bg-blue-900/20 p-4 rounded border border-blue-500/30 mt-4">
                <h5 className="text-blue-300 font-semibold mb-2">
                  🎯 Your Mission
                </h5>
                <p className="text-gray-300">
                  Create a multi-agent system for your own use case. Some ideas:
                </p>
                <ul className="list-disc list-inside text-gray-300 mt-2 space-y-1">
                  <li>
                    Customer service team (triage → specialist → escalation)
                  </li>
                  <li>
                    Content creation pipeline (research → write → edit →
                    publish)
                  </li>
                  <li>
                    E-commerce team (product → marketing → sales → support)
                  </li>
                  <li>
                    Data analysis team (collect → clean → analyze → visualize)
                  </li>
                </ul>
              </div>
              <div className="bg-green-900/20 p-3 rounded border border-green-500/30 mt-4">
                <strong className="text-green-300">🎉 Congratulations!</strong>
                <p className="text-gray-300 mt-1">
                  You've completed the VoltAgent tutorial! You now know how to
                  build AI agents with tools, memory, MCP integrations, and
                  multi-agent workflows. You're ready to build production AI
                  systems.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TutorialLayout>
  );
}
