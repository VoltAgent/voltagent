import { safeStringify } from "@voltagent/internal";
import { isToolUIPart } from "ai";
import { beforeAll, describe, expect, it } from "vitest";
import { events, chat, conversationSpans, json, request, userMessage, workflow } from "./http";

beforeAll(async () => {
  const agents = await json<Array<{ id: string; name: string }>>("/agents");
  expect(agents.find((agent) => agent.id === "demo-streaming")?.name).toBe(
    "01 · Streaming & reasoning",
  );
  expect(agents).toHaveLength(23);
  expect(await json("/workflows")).toHaveLength(15);
});

describe.sequential("agent scenario lab / real chat endpoint", () => {
  it.each(["pass", "fail", "error"])(
    "records live evaluation %s without changing the response",
    async (mode) => {
      const conversation = crypto.randomUUID();
      const result = await chat("demo-evaluation", [userMessage(mode)], {}, conversation);
      expect(result.text).toBe(mode);
      await expect
        .poll(
          async () =>
            (await conversationSpans("demo-evaluation", conversation)).find(
              (span) => span.attributes["eval.scorer.id"] === "demo-quality",
            ),
          { timeout: 5000 },
        )
        .toBeTruthy();
      const scorer = (await conversationSpans("demo-evaluation", conversation)).find(
        (span) => span.attributes["eval.scorer.id"] === "demo-quality",
      );
      if (mode === "error") expect(scorer?.attributes["eval.scorer.status"]).toBe("error");
      else
        expect(scorer?.attributes).toMatchObject({
          "eval.scorer.score": mode === "pass" ? 1 : 0,
          "eval.scorer.threshold": 0.8,
          "eval.scorer.threshold_passed": mode === "pass",
        });
    },
  );
  it.each([
    ["demo-streaming", "Streaming works"],
    ["travel-assistant", "Tools completed"],
    ["demo-parallel-tools", "Tools completed"],
    ["demo-tool-error", "Recovered from"],
    ["demo-invalid-tool", "Invalid tool input was rejected"],
    ["demo-fallback", "Fallback model completed"],
    ["demo-retry", "Provider retry succeeded"],
    ["demo-workspace", "Tools completed"],
    ["demo-retrieval", "3142"],
    ["demo-supervisor", "Supervisor combined"],
    ["demo-payloads", "Structured payloads"],
    ["demo-middleware", "Normalized request processed"],
  ])("%s completes with expected output", async (id, expected) => {
    const conversation = crypto.randomUUID();
    const result = await chat(id, undefined, {}, conversation);
    expect(result.chunks.filter((part) => part.type === "error")).toEqual([]);
    expect(result.text).toContain(expected);
    const spans = await conversationSpans(id, conversation);
    expect(spans.some((span) => span.attributes["entity.id"] === id && span.endTime)).toBe(true);
    if (id === "demo-streaming")
      expect(spans.find((span) => span.attributes["entity.id"] === id)?.attributes).toMatchObject({
        "usage.cached_tokens": 8,
        "usage.reasoning_tokens": 4,
      });
    if (id === "demo-workspace") {
      expect(
        spans.find((span) => span.attributes["tool.name"] === "read_file")?.attributes,
      ).toMatchObject({
        "workspace.operation": "filesystem.read",
        "workspace.fs.path": "/notes.txt",
      });
      expect(
        spans.find((span) => span.attributes["tool.name"] === "workspace_list_skills")?.attributes[
          "workspace.operation"
        ],
      ).toBe("skills.list");
    }
    if (id === "demo-retrieval")
      expect(
        spans.some(
          (span) =>
            span.name === "retriever.search" && span.attributes["retriever.results.count"] === 1,
        ),
      ).toBe(true);
    if (id === "demo-supervisor") {
      expect(spans.some((span) => span.attributes["subagent.id"] === "demo-specialist")).toBe(true);
      expect(
        result.chunks.some(
          (part) =>
            part.type === "data-subagent-stream" &&
            (part.data as { originalType?: string })?.originalType === "text-delta",
        ),
      ).toBe(true);
    }
    if (id === "demo-fallback" || id === "demo-retry")
      expect(spans.some((span) => span.status.code === 2)).toBe(true);
    if (id === "demo-invalid-tool") {
      expect(
        spans.find((span) => span.attributes["tool.input.rejected"] === true)?.attributes,
      ).toMatchObject({
        "tool.name": "validated_weather",
        "tool.executed": false,
      });
    }
    if (id === "demo-middleware")
      expect(spans.some((span) => span.name === "demo.custom-check")).toBe(true);
    if (id === "demo-parallel-tools") {
      const first = spans.find((span) => span.attributes["tool.name"] === "parallel_weather");
      const second = spans.find((span) => span.attributes["tool.name"] === "parallel_events");
      expect(first?.endTime).toBeTruthy();
      expect(Date.parse(second?.startTime ?? "")).toBeLessThan(Date.parse(first?.endTime ?? ""));
    }
    if (!["demo-tool-error", "demo-invalid-tool"].includes(id))
      expect(result.chunks.filter((part) => part.type === "tool-output-error")).toEqual([]);
    if (id === "demo-streaming")
      expect(result.chunks.some((part) => part.type === "reasoning-delta")).toBe(true);
    if (id === "travel-assistant")
      expect(
        result.chunks
          .filter((part) => part.type === "tool-input-available")
          .map((part) => part.toolName),
      ).toEqual(["get_weather", "plan_route"]);
    if (id === "demo-payloads")
      expect(
        result.chunks.find((part) => part.type === "tool-output-available")?.output,
      ).toMatchObject({ enabled: false, count: 0, note: "", empty: null });
  });

  it.each([true, false])(
    "approval decision %s continues without repeating the tool",
    async (approved) => {
      const input = [userMessage("Reserve a fictional seat")];
      const first = await chat("approval-demo", input);
      const message = first.message;
      if (!message) throw new Error("Missing assistant message");
      const part = message.parts.find(isToolUIPart);
      if (!part) throw new Error("Missing tool call");
      expect(part.state).toBe("approval-requested");
      if (part.state !== "approval-requested") throw new Error("Approval was not requested");
      message.parts = message.parts.map((entry) =>
        entry === part
          ? { ...part, state: "approval-responded", approval: { ...part.approval, approved } }
          : entry,
      );
      const next = await chat("approval-demo", [...input, message]);
      expect(next.text).toContain("Approval decision received");
      expect(next.chunks.filter((entry) => entry.type === "tool-approval-request")).toHaveLength(0);
      expect(safeStringify(next.chunks)).toContain(approved ? "reserved" : "denied");
    },
  );

  it.each([false, true])("client tool result / error=%s", async (error) => {
    const input = [userMessage("Read theme")];
    const first = await chat("demo-client-tool", input);
    const message = first.message;
    if (!message) throw new Error("Missing assistant message");
    const part = message.parts.find(isToolUIPart);
    if (!part) throw new Error("Missing tool call");
    expect(part.state).toBe("input-available");
    if (part.state !== "input-available") throw new Error("Client tool input missing");
    message.parts = message.parts.map((entry) =>
      entry === part
        ? error
          ? { ...part, state: "output-error", errorText: "Demo browser unavailable" }
          : { ...part, state: "output-available", output: { theme: "dark" } }
        : entry,
    );
    const next = await chat("demo-client-tool", [...input, message]);
    expect(next.text).toContain("Client result received");
    expect(next.text).toContain(error ? "unavailable" : "dark");
  });

  it.each(["demo-provider-error", "demo-guardrails", "demo-middleware"])(
    "%s surfaces intentional failure",
    async (id) => {
      const response = await request(`/agents/${id}/chat`, {
        input: [userMessage(id === "demo-middleware" ? "abort" : "block")],
      });
      if (response.ok)
        expect((await events(response)).some((part) => part.type === "error")).toBe(true);
      else expect(response.status).toBeGreaterThanOrEqual(400);
    },
  );
  it("redacts streamed output", async () => {
    const result = await chat("demo-guardrails", [userMessage("safe")]);
    expect(result.text).toContain("[redacted]");
    expect(result.text).not.toContain("123456");
  });
  it.each(["tr", "en"])("typed context selects %s", async (language) => {
    expect((await chat("demo-context", undefined, { language })).text).toContain(
      language === "tr" ? "Merhaba" : "Hello",
    );
  });
  it("rejects invalid typed context", async () => {
    const response = await request("/agents/demo-context/chat", {
      input: [userMessage("Hi")],
      options: { voltagent: { context: { language: "invalid" } } },
    });
    expect(response.ok).toBe(false);
  });
  it("persists working memory across conversation turns", async () => {
    const conversation = crypto.randomUUID();
    for (const text of ["remember tea", "remember coffee"])
      expect((await chat("demo-memory", [userMessage(text)], {}, conversation)).text).toContain(
        text,
      );
    const history = await json<{ messages: unknown[] }>(
      `/observability/memory/conversations/${conversation}/messages?userId=scenario-test&agentId=demo-memory&limit=100`,
    );
    expect(safeStringify(history.messages)).toContain("remember tea");
    expect(safeStringify(history.messages)).toContain("remember coffee");
  });
  it("summarizes a multi-turn conversation", async () => {
    const conversation = crypto.randomUUID();
    for (const text of ["Hello from the demo", "Remember this second turn"])
      expect((await chat("demo-summary", [userMessage(text)], {}, conversation)).text).toContain(
        "Conversation noted",
      );
    const summaries = (await conversationSpans("demo-summary", conversation)).filter(
      (span) => span.name === "agent.summary",
    );
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries.every((span) => span.status.code !== 2 && Boolean(span.endTime))).toBe(true);
    expect(
      summaries.some((span) =>
        String(span.attributes["agent.summary.text"]).includes("exploring the local demo"),
      ),
    ).toBe(true);
  });
  it("ends at the configured step limit", async () => {
    const conversation = crypto.randomUUID();
    const result = await chat(
      "demo-step-limit",
      [userMessage("Check step limit")],
      {},
      conversation,
    );
    expect(result.chunks.filter((part) => part.type === "tool-output-available")).toHaveLength(2);
    expect(result.text).toBe("");
    expect(
      (await conversationSpans("demo-step-limit", conversation)).find(
        (span) => span.attributes["voltagent.stopped_by_max_steps"] === true,
      )?.attributes,
    ).toMatchObject({ "voltagent.step_count": 2, "voltagent.max_steps": 2 });
  });
  it("passes an attachment through the chat protocol", async () => {
    const message = userMessage("Read this file");
    message.parts.push({
      type: "file",
      mediaType: "text/plain",
      filename: "demo.txt",
      url: "data:text/plain;base64,RGVtbyBmaWxl",
    });
    expect((await chat("demo-attachments", [message])).text).toContain("1 attachment(s)");
  });
  it("can interrupt a live stream", async () => {
    const controller = new AbortController();
    const conversation = crypto.randomUUID();
    const response = await request(
      "/agents/demo-stop-stream/chat",
      {
        input: [userMessage("Stream slowly")],
        options: { voltagent: { userId: "scenario-test", conversationId: conversation } },
      },
      controller.signal,
    );
    const chunks = await events(response, (part) => part.type === "text-delta");
    controller.abort();
    expect(chunks.some((part) => part.type === "text-delta")).toBe(true);
    expect(chunks.some((part) => part.type === "finish")).toBe(false);
    await expect
      .poll(
        async () => {
          const spans = await conversationSpans("demo-stop-stream", conversation);
          return spans.length >= 3 && spans.every((span) => !!span.endTime);
        },
        { timeout: 5000 },
      )
      .toBe(true);
  });
});

describe.sequential("workflow scenario lab / real streaming endpoint", () => {
  it.each(["complete", "bail", "abort"])("early exit mode=%s", async (mode) => {
    const { terminal, stream } = await workflow("demo-w-exit", { mode });
    expect(terminal.status).toBe(mode === "abort" ? "cancelled" : "completed");
    expect(stream.some((event) => event.type === "step-start" && event.from === "final-step")).toBe(
      mode === "complete",
    );
    if (mode === "bail") expect(terminal.result).toEqual({ message: "Early result" });
  });
  it.each([
    ["trip-plan", {}, { city: "Istanbul", itinerary: "Explore Istanbul on foot." }],
    ["demo-w-parallel", {}, { total: 10 }],
    ["demo-w-race", {}, { source: "cache" }],
    ["demo-w-conditional", { value: 2 }, { value: 4 }],
    ["demo-w-conditional", { value: 0 }, { value: 0 }],
    ["demo-w-branch", { route: "left" }, ["left"]],
    ["demo-w-branch", { route: "right" }, ["right"]],
    ["demo-w-branch", { route: "both" }, ["left", "right"]],
    ["demo-w-branch", { route: "none" }, []],
    ["demo-w-foreach", {}, [2, 4, 6]],
    ["demo-w-foreach", { items: [] }, []],
    ["demo-w-loop", {}, 5],
    ["demo-w-state", {}, { original: 2, doubled: 4, label: "mapped" }],
    ["demo-w-retry", {}, { attempts: 3 }],
    ["demo-w-failure", { mode: "ok" }, { ok: true }],
    ["demo-w-control", { waitMs: 10 }, { done: true }],
    ["demo-w-guardrail", {}, "Code ***"],
    ["demo-w-nested", {}, { value: 5 }],
    ["demo-w-agent", {}, { category: "support", priority: "high", routed: true }],
  ])("%s / %j", async (id, input, expected) => {
    const { terminal } = await workflow(id as string, input);
    expect(terminal.status).toBe("completed");
    expect(terminal.result).toEqual(expected);
    if (id === "demo-w-nested") {
      const data = await json<{
        traces: Array<{ spans: Array<{ attributes: Record<string, unknown> }> }>;
      }>("/observability/traces?entityId=demo-w-nested&entityType=workflow");
      expect(
        data.traces.some((trace) =>
          trace.spans.some((span) => span.attributes["workflow.step.id"] === "child-double"),
        ),
      ).toBe(true);
    }
  });
  it.each(["throw", "schema"])("reports expected step failure: %s", async (mode) => {
    const { terminal, stream } = await workflow("demo-w-failure", { mode });
    expect(terminal.status).toBe("error");
    expect(stream.some((event) => event.type.includes("error"))).toBe(true);
  });
  it("blocks at a workflow guardrail", async () => {
    expect((await workflow("demo-w-guardrail", { text: "block" })).terminal.status).toBe("error");
  });
  it("validates workflow input before starting", async () => {
    const run = await workflow("trip-plan", { city: "" });
    expect(run.terminal.status).toBe("error");
    expect(run.stream.some((event) => event.type === "step-start")).toBe(false);
  });
  it.each([true, false])("resumes with approval=%s", async (approved) => {
    const run = await workflow("trip-plan", { approval: true });
    expect(run.terminal.type).toBe("workflow-suspended");
    const result = await json(`/workflows/trip-plan/executions/${run.executionId}/resume`, {
      resumeData: { approved },
    });
    expect(result.status).toBe(approved ? "completed" : "error");
  });
  it("cancels a suspended checkpoint permanently and rejects resume", async () => {
    const run = await workflow("trip-plan", { approval: true });
    const path = `/workflows/trip-plan/executions/${run.executionId}`;
    expect(run.terminal.type).toBe("workflow-suspended");
    expect((await json(`${path}/cancel`, { reason: "No longer needed" })).status).toBe("cancelled");
    const state = await json<{
      status: string;
      cancellation: { reason: string };
      events: Array<{ type: string }>;
    }>(`${path}/state`);
    expect(state.status).toBe("cancelled");
    expect(state.cancellation.reason).toBe("No longer needed");
    expect(state.events.at(-1)?.type).toBe("workflow-cancelled");
    expect((await json(`${path}/cancel`, {})).status).toBe("cancelled");
    const resumed = await request(`${path}/resume`, { resumeData: { approved: true } });
    expect((await resumed.json()).success).toBe(false);
  });
  it("replays with changed step input and a new execution ID", async () => {
    const run = await workflow("trip-plan");
    const result = await json(`/workflows/trip-plan/executions/${run.executionId}/replay`, {
      stepId: "create-itinerary",
      inputData: { city: "Ankara" },
    });
    expect(result.executionId).not.toBe(run.executionId);
    expect(result.result).toMatchObject({ city: "Ankara" });
  });
  it.each(["cancel", "suspend"])("%s controls an active execution", async (action) => {
    const response = await request("/workflows/demo-w-control/stream", { input: { waitMs: 5000 } });
    const start = await events(response, (event) => event.type === "step-start");
    const executionId = start.find((event) => event.executionId)?.executionId;
    expect(executionId).toBeTruthy();
    await json(`/workflows/demo-w-control/executions/${executionId}/${action}`, {});
    await expect
      .poll(
        async () =>
          (await json(`/workflows/demo-w-control/executions/${executionId}/state`)).status,
        { timeout: 10000 },
      )
      .toBe(action === "cancel" ? "cancelled" : "suspended");
    if (action === "suspend") {
      const resumed = await json(`/workflows/demo-w-control/executions/${executionId}/resume`, {
        resumeData: {},
      });
      expect(resumed.status).toBe("completed");
    }
  });
});
