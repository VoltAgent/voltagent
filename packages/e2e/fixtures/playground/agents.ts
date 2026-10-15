import {
  Agent,
  BaseRetriever,
  InMemoryStorageAdapter,
  Memory,
  type RetrieveOptions,
  Workspace,
  createInputGuardrail,
  createInputMiddleware,
  createOutputGuardrail,
  createOutputMiddleware,
  tool,
} from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import { z } from "zod";
import { delay, demoModel, providerFailure, results, sequenceModel, userText } from "./models";

const freshMemory = () => new Memory({ storage: new InMemoryStorageAdapter() });
const defaults = { memory: false, maxSteps: 6, maxRetries: 0 } as const;
const file = (content: string) => ({
  content: content.split("\n"),
  created_at: "2026-01-01T00:00:00Z",
  modified_at: "2026-01-01T00:00:00Z",
});
const weather = (name: string) =>
  tool({
    description: `Local demo weather (${name})`,
    inputSchema: z.object({ city: z.string() }),
    execute: async ({ city }) => {
      await delay(180);
      return { city, condition: "Sunny", temperature: 22 };
    },
  });

class DemoRetriever extends BaseRetriever {
  async retrieve(_input: Parameters<BaseRetriever["retrieve"]>[0], options: RetrieveOptions) {
    options.logger?.info("Searching the offline demo knowledge base");
    await delay(80);
    return "VoltAgent's local playground uses port 3142. The API uses port 3141.";
  }
  getObservabilityAttributes() {
    return { "rag.knowledge_base_name": "Demo docs", "retriever.results.count": 1 };
  }
}

export function createDemoAgents() {
  const streaming = new Agent({
    ...defaults,
    id: "demo-streaming",
    name: "01 · Streaming & reasoning",
    instructions:
      "Send any message. Expect reasoning, streamed Markdown, usage with cache/reasoning tokens and a completed trace.",
    model: demoModel("demo-streaming", () => ({
      reasoning: "Compare the available demo options before answering.",
      text: "## Streaming works\n\nThis reply arrives in chunks.\n\n- **Reasoning** is collapsible.\n- Token usage includes cached and reasoning tokens.\n- Inspect model calls in the flow.\n\n```ts\nconst agent = new Agent({ model });\n```",
    })),
  });
  const sequential = new Agent({
    ...defaults,
    id: "travel-assistant",
    name: "02 · Sequential tools",
    instructions:
      "Send any message. Weather runs first, then the itinerary tool. Expect two tool nodes in time order and a final answer.",
    model: sequenceModel("demo-sequential", [
      [{ name: "get_weather", input: { city: "Istanbul" } }],
      [{ name: "plan_route", input: { city: "Istanbul" } }],
    ]),
    tools: {
      get_weather: weather("sequential"),
      plan_route: tool({
        inputSchema: z.object({ city: z.string() }),
        execute: async ({ city }) => {
          await delay(120);
          return { route: `${city}: ferry → coffee → waterfront` };
        },
      }),
    },
  });
  const parallel = new Agent({
    ...defaults,
    id: "demo-parallel-tools",
    name: "03 · Parallel tools",
    instructions:
      "Send any message. Two independent tools overlap. Expect separate lanes, then a model call that joins their results.",
    model: sequenceModel("demo-parallel", [
      [
        { name: "parallel_weather", input: { city: "Istanbul" } },
        { name: "parallel_events", input: {} },
      ],
    ]),
    tools: {
      parallel_weather: weather("parallel"),
      parallel_events: tool({
        inputSchema: z.object({}),
        execute: async () => {
          await delay(350);
          return ["Museum", "Ferry tour"];
        },
      }),
    },
  });
  const approval = new Agent({
    ...defaults,
    id: "approval-demo",
    name: "04 · Approval: allow / deny",
    instructions:
      "Send any message. Approve or deny the simulated reservation; no real booking occurs. Try both decisions in separate conversations.",
    model: sequenceModel(
      "demo-approval",
      [[{ name: "reserve_demo", input: { city: "Istanbul" } }]],
      "Approval decision received.",
    ),
    tools: {
      reserve_demo: tool({
        description: "Reserve a fictional demo seat",
        inputSchema: z.object({ city: z.string() }),
        needsApproval: true,
        execute: async ({ city }) => ({ reserved: true, city, demo: true }),
      }),
    },
  });
  const client = new Agent({
    ...defaults,
    id: "demo-client-tool",
    name: "05 · Client tool result",
    instructions:
      'Send any message. Open the tool card and submit {"theme":"dark"} as the client-side result. The server has no execute function for this tool.',
    model: sequenceModel(
      "demo-client",
      [[{ name: "read_browser_theme", input: {} }]],
      "Client result received.",
    ),
    tools: {
      read_browser_theme: tool({
        description: "Ask the browser for its theme",
        inputSchema: z.object({}),
      }),
    },
  });
  const toolError = new Agent({
    ...defaults,
    id: "demo-tool-error",
    name: "06 · Tool error & recovery",
    instructions:
      "Send any message. A tool intentionally throws; the model receives the error and recovers. The run completes, while its failed tool stays visible.",
    model: sequenceModel(
      "demo-tool-error",
      [[{ name: "broken_lookup", input: {} }]],
      "Recovered from the expected tool failure.",
    ),
    tools: {
      broken_lookup: tool({
        inputSchema: z.object({}),
        execute: async (): Promise<string> => {
          throw new Error("Demo lookup failed (intentional)");
        },
      }),
    },
  });
  const invalidTool = new Agent({
    ...defaults,
    id: "demo-invalid-tool",
    name: "07 · Invalid tool arguments",
    instructions:
      "Send any message. The model supplies a number where a city string is required. Validation must reject it before execution and expose the failure.",
    model: sequenceModel(
      "demo-invalid-tool",
      [[{ name: "validated_weather", input: { city: 42 } }]],
      "Invalid tool input was rejected.",
    ),
    tools: { validated_weather: weather("validation") },
  });
  const fallback = new Agent({
    ...defaults,
    id: "demo-fallback",
    name: "08 · Model fallback",
    instructions:
      "Send any message. Primary provider fails intentionally, then a fallback model succeeds. Inspect both attempts without losing the final response.",
    model: [
      {
        model: demoModel("demo-primary-unavailable", () => {
          throw providerFailure();
        }),
        maxRetries: 0,
      },
      {
        model: demoModel("demo-fallback-ok", () => ({
          text: "Fallback model completed the request.",
        })),
        maxRetries: 0,
      },
    ],
  });
  const retry = new Agent({
    ...defaults,
    id: "demo-retry",
    name: "09 · Model retry",
    instructions:
      "Send any message. The first provider attempt fails and the next succeeds. Each new request starts this sequence again.",
    maxRetries: 1,
    model: () => {
      let attempt = 0;
      return demoModel("demo-retry", () => {
        if (attempt++ === 0) throw providerFailure(true);
        return { text: "Provider retry succeeded." };
      });
    },
  });
  const providerError = new Agent({
    ...defaults,
    id: "demo-provider-error",
    name: "10 · Provider failure",
    instructions:
      "Send any message. This intentionally fails without fallback. Expect a visible chat error and a failed trace, with a way to try again.",
    model: demoModel("demo-offline", () => {
      throw providerFailure();
    }),
  });
  const guardrails = new Agent({
    ...defaults,
    id: "demo-guardrails",
    name: "11 · Guardrails: modify / block",
    instructions:
      'Send "safe" to see output redaction. Send "block" to stop at the input guardrail. Inspect decisions and before/after payloads.',
    model: demoModel("demo-guarded", () => ({ text: "Demo reference 123456 is ready." })),
    inputGuardrails: [
      createInputGuardrail({
        name: "Demo input policy",
        handler: async ({ input }) =>
          safeStringify(input).toLowerCase().includes("block")
            ? { pass: false, action: "block", message: "Demo input blocked intentionally" }
            : { pass: true, action: "allow" },
      }),
    ],
    outputGuardrails: [
      createOutputGuardrail({
        name: "Demo number redaction",
        handler: async ({ outputText }) => ({
          pass: true,
          action: "modify",
          modifiedOutput: String(outputText).replace(/123456/g, "[redacted]"),
        }),
        streamHandler: ({ part }) =>
          part.type === "text-delta"
            ? {
                ...part,
                text: part.text.replace(/123456/g, "[redacted]"),
              }
            : part,
      }),
    ],
  });
  const memory = new Agent({
    ...defaults,
    id: "demo-memory",
    name: "12 · History & working memory",
    instructions:
      'Send "remember tea", then "remember coffee" in the same conversation. Inspect working-memory changes and reload to restore messages.',
    memory: new Memory({
      storage: new InMemoryStorageAdapter(),
      workingMemory: { enabled: true, scope: "conversation" },
    }),
    model: demoModel("demo-memory", (call) =>
      results(call).length
        ? { text: `Saved working memory. Current request: ${userText(call)}.` }
        : {
            calls: [
              {
                name: "update_working_memory",
                input: { content: userText(call), mode: "replace" },
              },
            ],
          },
    ),
  });
  const context = new Agent({
    ...defaults,
    id: "demo-context",
    name: "13 · Typed context & instructions",
    contextSchema: z.object({ language: z.enum(["tr", "en"]).default("en") }),
    instructions: ({ context }) =>
      `Demo language=${context.get("language")}. In Run settings set context language to tr or en. An invalid value must fail validation.`,
    model: demoModel("demo-context", ({ prompt }) => ({
      text: prompt.some(
        (message) => message.role === "system" && message.content.includes("language=tr"),
      )
        ? "Merhaba! Typed context Türkçe yanıtı seçti."
        : "Hello! Typed context selected English.",
    })),
  });
  const workspace = new Agent({
    ...defaults,
    id: "demo-workspace",
    name: "14 · Workspace & skills",
    instructions:
      "Send any message. Read an in-memory file and list skills; inspect workspace events. Use the Workspace tab to browse the same demo files.",
    workspace: new Workspace({
      id: "demo-workspace",
      name: "Demo files",
      filesystem: {
        files: {
          "/notes.txt": file("Use the ferry for a day trip."),
          "/skills/travel/SKILL.md": file(
            "---\nname: Travel planner\ndescription: Plan a local trip\n---\nPrefer walking and ferries.",
          ),
        },
      },
      skills: { rootPaths: ["/skills"] },
    }),
    model: sequenceModel("demo-workspace", [
      [
        { name: "read_file", input: { file_path: "/notes.txt" } },
        { name: "workspace_list_skills", input: {} },
      ],
    ]),
  });
  const retrieval = new Agent({
    ...defaults,
    id: "demo-retrieval",
    name: "15 · Retrieval / RAG",
    instructions:
      "Ask which ports the playground uses. Expect an offline retriever span and recorded knowledge-base metadata.",
    retriever: new DemoRetriever(),
    model: demoModel("demo-rag", () => ({
      text: "The local playground runs on **3142** and the API on **3141**, according to the demo knowledge base.",
    })),
  });
  const specialist = new Agent({
    ...defaults,
    id: "demo-specialist",
    name: "Demo researcher",
    instructions: "Research a fictional local itinerary.",
    model: demoModel("demo-specialist", () => ({
      text: "Research complete: walk along the waterfront.",
    })),
  });
  const supervisor = new Agent({
    ...defaults,
    id: "demo-supervisor",
    name: "16 · Subagent delegation",
    instructions:
      "Send any message. The supervisor delegates to Demo researcher and uses its answer. Expect a nested agent lane and correlated spans.",
    subAgents: [specialist],
    supervisorConfig: {
      fullStreamEventForwarding: {
        types: [
          "text-delta",
          "reasoning-delta",
          "finish",
          "error",
          "abort",
          "tool-call",
          "tool-result",
        ],
      },
    },
    model: sequenceModel(
      "demo-supervisor",
      [
        [
          {
            name: "delegate_task",
            input: { task: "Find a local activity", targetAgents: ["Demo researcher"] },
          },
        ],
      ],
      "Supervisor combined the specialist result.",
    ),
  });
  const slow = new Agent({
    ...defaults,
    id: "demo-stop-stream",
    name: "17 · Stop a live stream",
    instructions:
      "Send any message, then press Stop while text is arriving. Expect the browser stream to stop and the controls to become usable again.",
    model: demoModel("demo-slow", () => ({
      text: "This is a deliberately slow stream. Press Stop to interrupt it.\n\n".repeat(24),
      delay: 180,
    })),
  });
  const payloads = new Agent({
    ...defaults,
    id: "demo-payloads",
    name: "18 · Falsy & large payloads",
    instructions:
      "Send any message. Inspect false, zero, null, empty strings, nested objects and a large list. Values must stay distinguishable from missing data.",
    model: sequenceModel(
      "demo-payloads",
      [[{ name: "inspect_payload", input: { enabled: false, count: 0, note: "", empty: null } }]],
      "Structured payloads are available in the tool span.",
    ),
    tools: {
      inspect_payload: tool({
        inputSchema: z.object({
          enabled: z.boolean(),
          count: z.number(),
          note: z.string(),
          empty: z.null(),
        }),
        execute: async (input) => ({
          ...input,
          rows: Array.from({ length: 65 }, (_, index) => ({
            index,
            nested: { value: index % 2 === 0 },
          })),
          literal: "<script>not executable</script>",
        }),
      }),
    },
  });
  const middleware = new Agent({
    ...defaults,
    id: "demo-middleware",
    name: "19 · Middleware & custom spans",
    instructions:
      'Send "safe" to transform the input and record a custom span/log. Send "abort" to stop in input middleware before a model call.',
    inputMiddlewares: [
      createInputMiddleware({
        name: "Demo input normalizer",
        handler: async ({ input, abort }) => {
          if (safeStringify(input).includes("abort"))
            abort("Demo middleware aborted intentionally");
          return "Normalized demo request";
        },
      }),
    ],
    outputMiddlewares: [
      createOutputMiddleware<string>({
        name: "Demo output suffix",
        handler: async ({ output }) => `${output}\n\nMiddleware processed this answer.`,
      }),
    ],
    hooks: {
      onStart: async ({ context }) => {
        const span = context.traceContext.createChildSpan("demo.custom-check", "tool", {
          attributes: { "demo.check": true, "span.type": "demo" },
        });
        await context.traceContext.withSpan(span, async () => {
          context.logger.info("Demo custom check completed");
          await delay(30);
        });
        span.end();
      },
    },
    model: demoModel("demo-middleware", () => ({ text: "Normalized request processed." })),
  });
  const stepLimit = new Agent({
    ...defaults,
    id: "demo-step-limit",
    name: "20 · Step limit",
    instructions:
      "Send any message. The model always requests another tool, but maxSteps=2 ends the loop. Expect two tool calls and no fabricated final answer.",
    maxSteps: 2,
    model: demoModel("demo-loop", () => ({ calls: [{ name: "ping_demo", input: {} }] })),
    tools: { ping_demo: tool({ inputSchema: z.object({}), execute: async () => "pong" }) },
  });
  const attachments = new Agent({
    ...defaults,
    id: "demo-attachments",
    name: "21 · Attachments",
    instructions:
      "Attach a small image or text file and send a message. The mock model reports attachment count; inspect the recorded message parts. This does not test provider vision quality.",
    model: demoModel("demo-files", ({ prompt }) => ({
      text: `Received ${
        prompt
          .filter((message) => message.role === "user")
          .flatMap((message) => message.content)
          .filter((part) => part.type === "file").length
      } attachment(s).`,
    })),
  });
  const summary = new Agent({
    ...defaults,
    id: "demo-summary",
    name: "22 · Conversation summarization",
    instructions:
      "Send two messages in one conversation. The second request summarizes older messages; inspect the summary span and remaining context.",
    memory: freshMemory(),
    summarization: {
      enabled: true,
      triggerTokens: 1,
      keepMessages: 1,
      model: demoModel("demo-summarizer", () => ({
        text: "The user is exploring the local demo.",
      })),
    },
    model: demoModel("demo-summary-chat", () => ({
      text: "Conversation noted. Send another message to trigger summarization.",
    })),
  });
  const evaluation = new Agent({
    ...defaults,
    id: "demo-evaluation",
    name: "23 · Live evaluation",
    instructions:
      'Send "pass", "fail", or "error". Inspect the scorer node for a passing score, a score below threshold, or a scorer failure. Scoring does not change the agent response.',
    model: demoModel("demo-evaluation", (options) => ({
      text: userText(options).includes("error")
        ? "error"
        : userText(options).includes("fail")
          ? "fail"
          : "pass",
    })),
    eval: {
      sampling: { type: "ratio", rate: 1 },
      scorers: {
        quality: {
          scorer: {
            id: "demo-quality",
            name: "Demo quality",
            metadata: { threshold: 0.8 },
            scorer: ({ payload }) => {
              if (payload.output === "error") throw new Error("Intentional demo scorer failure");
              return {
                score: payload.output === "pass" ? 1 : 0,
                metadata: { reason: "Deterministic local scorer; no model judge." },
              };
            },
          },
        },
      },
    },
  });
  return {
    streaming,
    sequential,
    parallel,
    approval,
    client,
    toolError,
    invalidTool,
    fallback,
    retry,
    providerError,
    guardrails,
    memory,
    context,
    workspace,
    retrieval,
    supervisor,
    slow,
    payloads,
    middleware,
    stepLimit,
    attachments,
    summary,
    evaluation,
  };
}
