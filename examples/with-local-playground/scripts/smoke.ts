import assert from "node:assert/strict";
import { safeStringify } from "@voltagent/internal";
import { type UIMessage, type UIMessageChunk, isToolUIPart, readUIMessageStream } from "ai";

const base = process.env.TEST_API_URL ?? "http://localhost:3151";
const request = (path: string, body?: unknown) =>
  fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : safeStringify(body),
    signal: AbortSignal.timeout(60000),
  });
async function json(path: string, body?: unknown) {
  const response = await request(path, body);
  const payload = await response.json();
  assert(response.ok && payload.success !== false, `Request failed: ${path}`);
  return payload.data;
}
async function events(path: string, body: unknown, stopAt?: string) {
  const response = await request(path, body);
  assert(response.ok && response.body, `Stream failed: ${path}`);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  const result: Array<Record<string, any>> = [];
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return result;
      buffer += value;
      let boundary = /\r?\n\r?\n/.exec(buffer);
      while (boundary) {
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const data = frame
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (data && data !== "[DONE]") {
          const event = JSON.parse(data);
          assert(event.type !== "error", `Stream reported an error: ${path}`);
          result.push(event);
          if (event.type === stopAt) return result;
        }
        boundary = /\r?\n\r?\n/.exec(buffer);
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
const user = (text: string): UIMessage => ({
  id: crypto.randomUUID(),
  role: "user",
  parts: [{ type: "text", text }],
});
async function chat(
  id: string,
  input: UIMessage[],
  conversationId = crypto.randomUUID(),
  context = {},
) {
  const chunks = await events(`/agents/${id}/chat`, {
    input,
    options: { voltagent: { userId: "live-smoke", conversationId, context } },
  });
  let message: UIMessage | undefined;
  for await (const part of readUIMessageStream({
    stream: new ReadableStream<UIMessageChunk>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk as UIMessageChunk);
        controller.close();
      },
    }),
  }))
    message = part;
  assert(message, "Missing assistant message");
  return {
    chunks,
    message,
    text: chunks
      .filter((chunk) => chunk.type === "text-delta")
      .map((chunk) => chunk.delta)
      .join(""),
  };
}
let passed = 0;
const pass = (name: string) => console.log(`PASS ${++passed}: ${name}`);

const support = await chat("real-support", [
  user("How do I reset my password? Search the help center first."),
]);
assert(support.chunks.some((chunk) => chunk.type === "tool-output-available"));
assert(support.text.includes("reset-password"));
pass("Real model calls knowledge tool and cites its result");
const invalid = await request("/agents/real-support/chat", {
  input: [user("Hi")],
  options: { voltagent: { context: { language: "xx" } } },
});
assert.equal(invalid.status, 400);
assert((await invalid.text()).includes("language"));
pass("Context validation reports the invalid field");

for (const approved of [true, false]) {
  const input = [user("Create a refund preview for ticket T-100, amount 25 USD.")];
  const first = await chat("real-approval", input);
  const part = first.message.parts.find(isToolUIPart);
  assert(part?.state === "approval-requested");
  first.message.parts = first.message.parts.map((item) =>
    item === part
      ? { ...part, state: "approval-responded", approval: { ...part.approval, approved } }
      : item,
  );
  const next = await chat("real-approval", [...input, first.message]);
  assert(!next.chunks.some((chunk) => chunk.type === "tool-approval-request"));
  assert(next.text.length > 0);
  assert(safeStringify(next.chunks).includes(approved ? "preview-only" : "denied"));
  pass(`Real model approval ${approved ? "accepts" : "declines"} without another approval loop`);
}
for (const declined of [false, true]) {
  const input = [user("Read my browser context, then tell me its theme and locale.")];
  const first = await chat("real-browser", input);
  const part = first.message.parts.find(isToolUIPart);
  assert(part?.state === "input-available");
  first.message.parts = first.message.parts.map((item) =>
    item !== part
      ? item
      : declined
        ? { ...part, state: "output-error", errorText: "The user declined browser access." }
        : { ...part, state: "output-available", output: { theme: "dark", locale: "tr-TR" } },
  );
  const next = await chat("real-browser", [...input, first.message]);
  assert(next.text.length > 0);
  assert(!next.chunks.some((chunk) => chunk.type === "tool-input-available"));
  if (!declined) assert(next.text.toLowerCase().includes("dark"));
  pass(`Client tool ${declined ? "decline" : "result"} continues with the real model`);
}
const conversationId = crypto.randomUUID();
await chat(
  "real-memory",
  [user("Remember that my favorite drink is jasmine tea.")],
  conversationId,
);
const recall = await chat("real-memory", [user("What is my favorite drink?")], conversationId);
assert(recall.text.toLowerCase().includes("jasmine"));
const traces = await json("/observability/traces?entityId=real-memory&entityType=agent");
const summaries = traces.traces
  .filter((trace: any) =>
    trace.spans.some((span: any) => span.attributes["conversation.id"] === conversationId),
  )
  .flatMap((trace: any) => trace.spans)
  .filter((span: any) => span.name === "agent.summary");
assert(
  summaries.some(
    (span: any) => span.endTime && span.status.code !== 2 && span.attributes["agent.summary.text"],
  ),
);
pass("Real summarization succeeds and preserves the user preference");

for (const decision of ["approve", "decline", "cancel"]) {
  const stream = await events(
    "/workflows/real-triage/stream",
    { input: { message: "I was billed twice. Please review a refund." } },
    "workflow-suspended",
  );
  const terminal = stream.find((event) => event.type === "workflow-suspended");
  assert(terminal?.executionId);
  const path = `/workflows/real-triage/executions/${terminal.executionId}`;
  const outcome = await json(
    `${path}/${decision === "cancel" ? "cancel" : "resume"}`,
    decision === "cancel" ? {} : { resumeData: { approved: decision === "approve" } },
  );
  const state = await json(`${path}/state`);
  assert.equal(state.status, decision === "cancel" ? "cancelled" : "completed");
  if (decision !== "cancel") {
    assert.equal(outcome.result.category, "billing");
    assert.equal(outcome.result.decision, decision === "approve" ? "queued" : "declined");
  } else {
    const resumed = await request(`${path}/resume`, { resumeData: { approved: true } });
    assert.equal((await resumed.json()).success, false);
  }
  pass(`Real structured classification → human review → ${decision}`);
}
console.log(`${passed} live checks passed. Inspect these runs in the playground’s Recent runs.`);
