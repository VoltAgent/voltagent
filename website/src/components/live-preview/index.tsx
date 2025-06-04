import { amethyst } from "@codesandbox/sandpack-themes";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackFileExplorer,
} from "@codesandbox/sandpack-react";
import { useState } from "react";
import { useMediaQuery } from "@site/src/hooks/use-media-query";

export default function LivePreview() {
  const [activeTab, setActiveTab] = useState<"code" | "console">("code");
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <div
      className="w-full mx-auto px-4 sm:px-6 lg:px-8  items-center landing-xs:mb-16 flex flex-col landing-md:mb-36"
      style={{
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div className="flex items-center justify-center gap-4 mb-3">
        <div className="inline-flex border border-solid border-emerald-400/20 self-center rounded-md">
          <button
            type="button"
            className={`py-2 px-8 cursor-pointer font-medium rounded-l-md outline-none border-none text-sm transition-colors ${
              activeTab === "code"
                ? "bg-emerald-400/10 text-emerald-400 shadow-sm"
                : "bg-transparent text-zinc-400 hover:bg-zinc-400/20"
            }`}
            onClick={() => setActiveTab("code")}
          >
            Core Framework
          </button>
          <button
            type="button"
            className={`py-2 px-8 cursor-pointer font-medium outline-none border-none rounded-r-md text-sm transition-colors ${
              activeTab === "console"
                ? "bg-emerald-400/10 text-emerald-400 shadow-sm"
                : "bg-transparent text-zinc-400 hover:bg-zinc-400/20"
            }`}
            onClick={() => setActiveTab("console")}
          >
            VoltOps LLM Observability
          </button>
        </div>
      </div>

      <div className="w-full h-[72vh]">
        <div
          style={{
            display: activeTab === "code" ? "block" : "none",
            height: "100%",
          }}
        >
          <SandpackProvider
            files={{
              "/index.ts": {
                active: true,
                code: `import { VoltAgent, Agent, createTool, createHooks } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { fetchRepoContributorsTool } from "./tools";
import { fetchRepoStarsTool } from "./tools";

// Create the stars fetcher agent
const starsFetcherAgent = new Agent({
  name: "Stars Fetcher",
  description: "Fetches the number of stars for a GitHub repository using the GitHub API",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [fetchRepoStarsTool],
});

// Create the contributors fetcher agent
const contributorsFetcherAgent = new Agent({
  name: "Contributors Fetcher",
  description: "Fetches the list of contributors for a GitHub repository using the GitHub API",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [fetchRepoContributorsTool],
});

// Create the analyzer agent
const analyzerAgent = new Agent({
  name: "Repo Analyzer",
  description: "Analyzes repository statistics and provides insights",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Create the supervisor agent that coordinates all the sub-agents
const supervisorAgent = new Agent({
  name: "Supervisor",
  description: \`You are a GitHub repository analyzer. When given a GitHub repository URL or owner/repo format, you will:
1. Use the StarsFetcher agent to get the repository's star count
2. Use the ContributorsFetcher agent to get the repository's contributors
3. Use the RepoAnalyzer agent to analyze this data and provide insights

Example input: https://github.com/voltagent/voltagent or voltagent/voltagent
\`,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [starsFetcherAgent, contributorsFetcherAgent, analyzerAgent],
});

// Initialize the VoltAgent with the agent hierarchy
new VoltAgent({
  agents: {
    supervisorAgent,
  },
});

`,
              },
              "/tools/index.ts": {
                active: false,
                code: `import { Octokit } from "@octokit/rest";
import { createTool } from "@voltagent/core";
import { z } from "zod";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Tool to fetch repository stars
export const fetchRepoStarsTool = createTool({
  name: "repo_stars",
  description: "Fetches the number of stars for a GitHub repository",
  parameters: z.object({
    owner: z.string().describe("The owner of the repository"),
    repo: z.string().describe("The name of the repository"),
  }),
  execute: async ({ owner, repo }: { owner: string; repo: string }) => {
    try {
      const response = await octokit.repos.get({
        owner,
        repo,
      });
      return {
        success: true,
        stars: response.data.stargazers_count,
        message: \`Repository \${owner}/\${repo} has \${response.data.stargazers_count} stars.\`,
      };
    } catch (error) {
      return {
        success: false,
        stars: 0,
        message: \`Error fetching stars for \${owner}/\${repo}: \${error instanceof \Error ? error.message : String(error)}\`,
      };
    }
  },
});

// Tool to fetch repository contributors
export const fetchRepoContributorsTool = createTool({
  name: "repo_contributors",
  description: "Fetches the list of contributors for a GitHub repository",
  parameters: z.object({
    owner: z.string().describe("The owner of the repository"),
    repo: z.string().describe("The name of the repository"),
  }),
  execute: async ({ owner, repo }: { owner: string; repo: string }) => {
    try {
      const response = await octokit.repos.listContributors({
        owner,
        repo,
      });

      const contributors = response.data.map((contributor) => ({
        login: contributor.login,
        contributions: contributor.contributions,
      }));

      return {
        success: true,
        contributors,
        message: \`Repository \${owner}/\${repo} has \${contributors.length} contributors.\`,
        details: contributors,
      };
    } catch (error) {
      return {
        success: false,
        contributors: [],
        message: \`Error fetching contributors for \${owner}/\${repo}: \${error instanceof \Error ? error.message : String(error)}\`,
      };
    }
  },
});

            `,
              },
              "package.json": {
                active: false,
                code: `{
  "name": "voltagent-github-repo-analyzer",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch --env-file=.env ./src ",
    "start": "node dist/index.js",
    "volt": "volt"
  },
  "dependencies": {
    "@ai-sdk/openai": "^1.0.0",
    "@octokit/rest": "^21.0.0",
    "@voltagent/core": "^0.1.0",
    "@voltagent/vercel-ai": "^0.1.0",
    "zod": "^3.22.2"
  },
  "devDependencies": {
    "@types/node": "^20.10.4",
    "@voltagent/cli": "^0.1.0",
    "tsx": "^4.6.2",
    "typescript": "^5.3.3"
  }
}
`,
              },
            }}
            customSetup={{
              entry: "/index.ts",
            }}
            theme={{
              ...amethyst,
              colors: {
                ...amethyst.colors,
                accent: "#22C55E",
              },
              font: {
                size: isMobile ? "9px" : "12px",
              },
            }}
            style={{
              height: "100%",
              border: "2px solid #2c3335",
              borderRadius: "6px",
              fontSize: isMobile ? "9px" : "12px",
              backgroundColor: "#fff",
            }}
          >
            <SandpackLayout style={{ height: "100%" }}>
              {!isMobile && <SandpackFileExplorer style={{ height: "100%" }} />}
              <SandpackCodeEditor
                wrapContent
                readOnly
                style={{ height: "100%", fontSize: isMobile ? "9px" : "12px" }}
              />
            </SandpackLayout>
          </SandpackProvider>
        </div>

        <div
          style={{
            display: activeTab === "console" ? "block" : "none",
            height: "100%",
          }}
        >
          <iframe
            src="https://console.voltagent.dev/demo"
            title="Voltage Agent Console"
            className="w-full h-full"
            style={{
              height: "100%",
              border: "2px solid #2c3335",
              borderRadius: "6px",
            }}
          />
        </div>
      </div>
    </div>
  );
}
