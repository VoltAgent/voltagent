# @voltagent/sandbox-e2b

## 3.0.0-next.0

### Major Changes

- Release the first VoltAgent 3 prerelease on the `next` channel.

  VoltAgent 3 aligns the framework with AI SDK v7, moves the published packages to an ESM-only runtime boundary, and requires Node.js 22 or later. This release keeps the core agent, memory, tool, workflow, guardrail, observability, server, MCP, A2A, AG-UI, and storage features available, while tightening the public API around AI SDK-compatible names and call shapes.

  ### Install from the next channel

  ```bash
  pnpm add @voltagent/core@next @voltagent/server-hono@next @voltagent/logger@next
  pnpm add ai@^7 @ai-sdk/openai@^4 zod@^4
  ```

  If your app uses additional VoltAgent packages, keep all `@voltagent/*` packages on the same major/prerelease line:

  ```bash
  pnpm add @voltagent/postgres@next @voltagent/supabase@next @voltagent/voice@next
  ```

  ### Runtime requirements

  VoltAgent 3 requires Node.js 22+ and ESM imports.

  ```json
  {
    "type": "module",
    "engines": {
      "node": ">=22"
    }
  }
  ```

  Before:

  ```js
  const { Agent } = require("@voltagent/core");
  const { openai } = require("@ai-sdk/openai");
  ```

  After:

  ```ts
  import { Agent } from "@voltagent/core";
  import { openai } from "@ai-sdk/openai";
  ```

  ### AI SDK v7 alignment

  Upgrade `ai` and provider packages to AI SDK v7-compatible versions:

  ```bash
  pnpm add ai@^7 @ai-sdk/provider-utils@^5
  pnpm add @ai-sdk/openai@^4
  ```

  Common provider package upgrades:

  | Package                     | Version for AI SDK v7 |
  | --------------------------- | --------------------- |
  | `@ai-sdk/openai`            | `^4`                  |
  | `@ai-sdk/anthropic`         | `^4`                  |
  | `@ai-sdk/google`            | `^4`                  |
  | `@ai-sdk/azure`             | `^4`                  |
  | `@ai-sdk/groq`              | `^4`                  |
  | `@ai-sdk/mistral`           | `^4`                  |
  | `@ai-sdk/openai-compatible` | `^3`                  |
  | `@ai-sdk/amazon-bedrock`    | `^5`                  |
  | `@ai-sdk/google-vertex`     | `^5`                  |

  ### Zod 4-only

  VoltAgent 3 requires Zod 4. The framework packages now use `zod@^4` peer ranges, examples and templates install Zod 4, and the old Zod 3 JSON Schema/OpenAPI compatibility fallback has been removed.

  ```bash
  pnpm add zod@^4
  ```

  ### Agent usage

  The object-style call shape is the preferred API. AI SDK generation options stay at the top level, while VoltAgent runtime concerns live under `voltagent`.

  ```ts
  const result = await agent.generateText({
    prompt: "Summarize this support ticket",
    temperature: 0.2,
    maxOutputTokens: 500,
    voltagent: {
      memory: {
        userId: "user-123",
        conversationId: "ticket-456",
      },
      context: {
        requestId: "req-789",
      },
    },
  });
  ```

  The same shape works for streaming:

  ```ts
  const result = await agent.streamText({
    prompt: "Write a short release note",
    stopWhen: isStepCount(5),
    voltagent: {
      memory: {
        userId: "user-123",
        conversationId: "release-456",
      },
    },
  });

  for await (const part of result.stream) {
    if (part.type === "text-delta") {
      process.stdout.write(part.text);
    }
  }
  ```

  `fullStream` remains as a deprecated compatibility alias during the transition, but new code should use `stream`.

  ### Tool usage

  VoltAgent now accepts AI SDK-style tool sets directly, so projects can use `tool()` without wrapping every tool in `createTool`.

  ```ts
  import { Agent, tool } from "@voltagent/core";
  import { openai } from "@ai-sdk/openai";
  import { z } from "zod";

  const agent = new Agent({
    name: "Weather Agent",
    model: openai("gpt-4o-mini"),
    tools: {
      getWeather: tool({
        description: "Get the weather for a city",
        inputSchema: z.object({
          city: z.string(),
        }),
        execute: async ({ city }) => {
          return { city, forecast: "Sunny", temperature: 72 };
        },
      }),
    },
  });
  ```

  VoltAgent-specific tool metadata is available through the `voltagent` namespace, so existing framework features can be used with AI SDK-style tools:

  ```ts
  const refundCustomer = tool({
    description: "Refund a customer order",
    inputSchema: z.object({
      orderId: z.string(),
      reason: z.string(),
    }),
    execute: async ({ orderId, reason }) => {
      return issueRefund(orderId, reason);
    },
    voltagent: {
      name: "refundCustomer",
      purpose: "Issue customer refunds",
    },
  });
  ```

  `createTool` remains available for existing tools and for codebases that prefer the VoltAgent-native helper.

  ### Tool approval

  AI SDK native `toolApproval` is forwarded through VoltAgent agent calls.

  ```ts
  const result = await agent.streamText({
    prompt: "Refund order order_123 if it is eligible",
    toolApproval: {
      refundCustomer: "user-approval",
    },
  });
  ```

  Use call-level `toolApproval` for new per-request approval flows. Use `voltagent.needsApproval` only when approval should be static tool metadata or part of an existing VoltAgent approval/tool-policy flow. If both are provided, call-level `toolApproval` takes precedence.

  ### Structured output

  Prefer AI SDK v7-style `output` over `experimental_output`.

  ```ts
  import { Output } from "ai";
  import { z } from "zod";

  const result = await agent.generateText({
    prompt: "Extract the customer profile",
    output: Output.object({
      schema: z.object({
        name: z.string(),
        plan: z.enum(["free", "pro", "enterprise"]),
      }),
    }),
  });

  console.log(result.output);
  ```

  `generateObject` and `streamObject` remain as deprecated compatibility wrappers. For new code, use `generateText` or `streamText` with `output`.

  ### Migration checklist
  1. Upgrade local development, CI, and production to Node.js 22 or later.
  2. Set `"type": "module"` and replace CommonJS `require()` calls with ESM imports.
  3. Upgrade all `@voltagent/*` packages together from the `next` channel.
  4. Upgrade `ai` to `^7` and AI SDK provider packages to their v7-compatible majors.
  5. Upgrade `zod` to `^4`.
  6. Replace `stepCountIs` with `isStepCount`.
  7. Prefer `result.stream` over `result.fullStream`.
  8. Prefer `output` over `experimental_output`.
  9. Prefer object-style agent calls for new code, with VoltAgent runtime options under `voltagent`.

### Patch Changes

- Updated dependencies []:
  - @voltagent/core@3.0.0-next.0

## 2.0.3

### Patch Changes

- [#1356](https://github.com/VoltAgent/voltagent/pull/1356) [`2b66ae3`](https://github.com/VoltAgent/voltagent/commit/2b66ae37a9578f77e13b992fcc72b307cff5b6ab) Thanks [@nuthalapativarun](https://github.com/nuthalapativarun)! - Add README documentation

## 2.0.2

### Patch Changes

- [#1051](https://github.com/VoltAgent/voltagent/pull/1051) [`b0482cb`](https://github.com/VoltAgent/voltagent/commit/b0482cb16e3c2aff786581a1291737f772e1d19d) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: align sandbox package core dependency strategy with plugin best practices
  - Update `@voltagent/sandbox-daytona` to use `@voltagent/core` via `peerDependencies` + `devDependencies` instead of runtime `dependencies`.
  - Raise `@voltagent/sandbox-daytona` peer minimum to `^2.3.8` to match runtime usage of `normalizeCommandAndArgs`.
  - Align `@voltagent/sandbox-e2b` development dependency on `@voltagent/core` to `^2.3.8`.

- [#1068](https://github.com/VoltAgent/voltagent/pull/1068) [`b95293b`](https://github.com/VoltAgent/voltagent/commit/b95293bb71f144ea106bcf809f446760af7c4227) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: expose the underlying E2B SDK sandbox instance from `E2BSandbox`.
  - Added a public `getSandbox()` method that returns the original `e2b` `Sandbox` instance so provider-specific APIs (for example `files.read`) can be used directly.
  - Added `E2BSandboxInstance` type export for the underlying SDK sandbox type.

## 2.0.1

### Patch Changes

- [#1025](https://github.com/VoltAgent/voltagent/pull/1025) [`c783943`](https://github.com/VoltAgent/voltagent/commit/c783943fa165734fcadabbd0c6ce12212b3a5969) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: introduce experimental Workspace support with filesystem, sandbox execution, search indexing, and skill discovery; add global workspace defaults and optional sandbox providers (E2B/Daytona). - #1008

  Example:

  ```ts
  import { Agent, Workspace, LocalSandbox, NodeFilesystemBackend } from "@voltagent/core";

  const workspace = new Workspace({
    id: "support-workspace",
    operationTimeoutMs: 30_000,
    filesystem: {
      backend: new NodeFilesystemBackend({
        rootDir: "./.workspace",
      }),
    },
    sandbox: new LocalSandbox({
      rootDir: "./.sandbox",
      isolation: { provider: "detect" },
      cleanupOnDestroy: true,
    }),
    search: {
      autoIndexPaths: ["/notes", "/tickets"],
    },
    skills: {
      rootPaths: ["/skills"],
    },
  });

  const agent = new Agent({
    name: "support-agent",
    model,
    instructions: "Use workspace tools to review tickets and summarize findings.",
    workspace,
    workspaceToolkits: {
      filesystem: {
        toolPolicies: {
          tools: { write_file: { needsApproval: true } },
        },
      },
    },
  });

  const { text } = await agent.generateText(
    [
      "Scan /tickets and /notes.",
      "Use workspace_search to find urgent issues from the last week.",
      "Summarize the top 3 risks and include file paths as citations.",
    ].join("\n"),
    { maxSteps: 40 }
  );
  ```
