import path from "node:path";
import {
  Agent,
  InMemoryVectorAdapter,
  LocalSandbox,
  Memory,
  NodeFilesystemBackend,
  VoltAgent,
  Workspace,
} from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLVectorAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

// Create logger
const logger = createPinoLogger({
  name: "with-workspace",
  level: "info",
});

// Create Memory instance with vector support for semantic search and working memory
const memory = new Memory({
  storage: new LibSQLMemoryAdapter(),
  embedding: "openai/text-embedding-3-small",
  vector: new LibSQLVectorAdapter(),
  generateTitle: true,
});

const workspaceRoot = path.resolve(process.cwd(), "workspace");

const workspace = new Workspace({
  id: "workspace-example",
  name: "Workspace Example",
  filesystem: {
    backend: new NodeFilesystemBackend({
      rootDir: workspaceRoot,
      virtualMode: true,
    }),
  },
  sandbox: new LocalSandbox({
    rootDir: workspaceRoot,
  }),
  search: {
    autoIndexPaths: [{ path: "/", glob: "**/*.{md,txt,csv}" }],
    embedding: "openai/text-embedding-3-small",
    vector: new InMemoryVectorAdapter(),
  },
  skills: {
    rootPaths: ["/skills"],
  },
});

const skillsHook = workspace.createSkillsPromptHook({
  includeAvailable: true,
  includeActivated: true,
});

const agent = new Agent({
  name: "Workspace Agent",
  instructions: [
    "You are a helpful assistant.",
    "Use the workspace filesystem for notes under /notes and data under /data.",
    "Use workspace_search to find relevant files before answering.",
    "Skills live under /skills; activate them when a task matches the description.",
  ].join(" "),
  model: "openai/gpt-4o-mini",
  memory,
  workspace,
  hooks: skillsHook,
  workspaceToolkits: {
    filesystem: {
      toolPolicies: {
        tools: { write_file: { needsApproval: true } },
      },
    },
  },
});

new VoltAgent({
  agents: { agent },
  server: honoServer(),
  logger,
});
