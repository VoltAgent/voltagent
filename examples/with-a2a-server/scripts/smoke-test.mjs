#!/usr/bin/env node
import assert from "node:assert/strict";
import { A2AServer } from "@voltagent/a2a-server";
import { safeStringify } from "@voltagent/internal";

const AGENT_ID = "supportagent";
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3141";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed (${res.status} ${res.statusText}): ${text}`);
  }

  return res.json();
}

async function getAgentCard() {
  return fetchJson(`${BASE_URL}/.well-known/${AGENT_ID}/agent-card.json`);
}

async function sendMessage(message) {
  return fetchJson(`${BASE_URL}/a2a/${AGENT_ID}`, {
    method: "POST",
    body: safeStringify({
      jsonrpc: "2.0",
      id: "1",
      method: "message/send",
      params: {
        message,
      },
    }),
  });
}

async function getTask(taskId) {
  return fetchJson(`${BASE_URL}/a2a/${AGENT_ID}`, {
    method: "POST",
    body: safeStringify({
      jsonrpc: "2.0",
      id: "2",
      method: "tasks/get",
      params: { id: taskId },
    }),
  });
}

async function streamMessage(message, options = {}) {
  const { onEvent, onOpen, params, requestId } = options;
  const rpcId = requestId ?? "stream-1";
  const payloadParams = params ?? { message };
  const response = await fetch(`${BASE_URL}/a2a/${AGENT_ID}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Accept: "text/event-stream",
    },
    body: safeStringify({
      jsonrpc: "2.0",
      id: rpcId,
      method: "message/stream",
      params: payloadParams,
    }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(
      `Streaming request failed (${response.status} ${response.statusText}): ${text}`,
    );
  }

  if (onOpen) {
    await onOpen();
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separatorIndex;
    // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
    while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      const dataLines = rawEvent
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => line.slice(6))
        .join("\n");

      if (!dataLines) {
        continue;
      }

      const payload = dataLines.startsWith("\u001E") ? dataLines.slice(1) : dataLines;
      if (!payload.trim()) {
        continue;
      }

      let parsed;
      try {
        parsed = JSON.parse(payload);
      } catch (error) {
        throw new Error(`Failed to parse streamed payload: ${payload}\n${error}`);
      }

      if (onEvent) {
        await onEvent(parsed);
      }

      events.push(parsed);
    }
  }

  return events;
}

async function cancelTask(taskId) {
  return fetchJson(`${BASE_URL}/a2a/${AGENT_ID}`, {
    method: "POST",
    body: safeStringify({
      jsonrpc: "2.0",
      id: `cancel-${taskId}`,
      method: "tasks/cancel",
      params: { id: taskId },
    }),
  });
}

async function run() {
  console.log("🔎 Fetching agent card...");
  const card = await getAgentCard();
  assert.equal(card.name, "supportagent");
  assert.equal(Array.isArray(card.skills), true);
  console.log("✅ Agent card retrieved");

  console.log("📨 Sending message through A2A...\n");
  const response = await sendMessage({
    kind: "message",
    role: "user",
    messageId: "msg-1",
    parts: [{ kind: "text", text: "Saat kaç?" }],
  });

  assert.equal(response.jsonrpc, "2.0");
  assert.equal(response.error, undefined);
  const task = response.result;
  assert.ok(task?.id, "Task id missing in response");
  assert.equal(task.status.state, "completed");
  console.log("✅ Message processed, task completed");

  console.log("📥 Checking task history...");
  const queried = await getTask(task.id);
  assert.equal(queried.jsonrpc, "2.0");
  assert.equal(queried.result.id, task.id);
  assert.equal(Array.isArray(queried.result.history), true);
  assert.equal(queried.result.history.length >= 2, true);
  console.log("✅ Task history retrieved\n");

  console.log("📡 Streaming message through A2A...\n");
  const streamEvents = await streamMessage({
    kind: "message",
    role: "user",
    messageId: "msg-2",
    parts: [{ kind: "text", text: "Bana bir şiir oku" }],
  });

  assert.equal(streamEvents.length > 0, true, "No stream events were received");

  const workingUpdate = streamEvents.find((event) => event?.result?.status?.state === "working");
  assert.ok(workingUpdate, "Expected to receive at least one working status update");

  const finalEvent = streamEvents.at(-1);
  assert.ok(finalEvent, "Missing final stream event");
  assert.equal(finalEvent.jsonrpc, "2.0");
  assert.equal(finalEvent.error, undefined);
  assert.equal(finalEvent.result.status.state, "completed");
  const history = finalEvent.result.history;
  assert.equal(Array.isArray(history), true);
  const lastMessage = history.at(-1);
  assert.equal(lastMessage?.role, "agent");
  assert.equal(typeof lastMessage?.parts?.[0]?.text, "string");
  assert.equal(lastMessage.parts[0].text.length > 0, true);
  console.log("✅ Streaming response received and completed\n");

  console.log("🛑 Cancelling in-flight stream...\n");
  const cancelTaskId = "cancel-task-1";
  let cancelTriggered = false;
  const cancelEvents = await streamMessage(
    {
      kind: "message",
      role: "user",
      messageId: "msg-3",
      taskId: cancelTaskId,
      parts: [
        {
          kind: "text",
          text: "Lütfen 100 paragraflık, her paragraf en az 5 cümle olacak şekilde çok detaylı ve yaratıcı bir roman yaz. Paragraflar arasında mutlaka boş satırlar bırak.",
        },
      ],
    },
    {
      requestId: "stream-2",
      params: {
        id: cancelTaskId,
        message: {
          kind: "message",
          role: "user",
          messageId: "msg-3",
          taskId: cancelTaskId,
          parts: [
            {
              kind: "text",
              text: "Lütfen 100 paragraflık, her paragraf en az 5 cümle olacak şekilde çok detaylı ve yaratıcı bir roman yaz. Paragraflar arasında mutlaka boş satırlar bırak.",
            },
          ],
        },
      },
      async onOpen() {
        await cancelTask(cancelTaskId);
        cancelTriggered = true;
      },
    },
  );

  assert.equal(cancelTriggered, true, "Cancel request was not triggered");

  const cancelFinal = cancelEvents.at(-1);
  assert.ok(cancelFinal, "Missing final cancel event");
  assert.equal(cancelFinal.jsonrpc, "2.0");
  assert.equal(cancelFinal.error, undefined);
  const cancelFinalState = cancelFinal.result.status.state;
  assert.ok(
    cancelFinalState === "canceled" || cancelFinalState === "completed",
    "Unexpected final stream state",
  );
  if (cancelFinalState === "canceled") {
    console.log("✅ Cancellation propagated to stream\n");
  } else {
    console.log("ℹ️ Stream completed before cancellation could interrupt the agent\n");
  }

  console.log("🧪 Verifying cancellation propagation with stub agent...\n");
  const stubAgent = {
    id: "stub-agent",
    purpose: "Stub agent used for cancellation testing",
    async generateText() {
      await delay(10);
      return {
        text: "stub",
        finishReason: "stop",
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      };
    },
    async streamText(_content, options = {}) {
      const abortSignal = options.abortSignal;

      const textPromise = (async () => {
        await delay(500);
        if (abortSignal?.aborted) {
          return "";
        }
        return "final";
      })();

      async function* textStream() {
        yield "chunk-1";
        await delay(100);
        if (abortSignal?.aborted) {
          const error = new Error("aborted");
          error.name = "AbortError";
          throw error;
        }
        await delay(400);
        yield "chunk-2";
      }

      return {
        text: textPromise,
        finishReason: "stop",
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        textStream: textStream(),
      };
    },
  };

  const stubRegistry = {
    getAgent(id) {
      return id === "stub-agent" ? stubAgent : undefined;
    },
    getAllAgents() {
      return [stubAgent];
    },
  };

  const stubServer = new A2AServer({ name: "Stub", version: "0.0.1" });
  stubServer.initialize({ agentRegistry: stubRegistry });

  const stubStreamResponse = await stubServer.handleRequest("stub-agent", {
    jsonrpc: "2.0",
    id: "stub-stream",
    method: "message/stream",
    params: {
      message: {
        kind: "message",
        role: "user",
        messageId: "stub-msg",
        parts: [{ kind: "text", text: "test" }],
      },
    },
  });

  assert.ok("kind" in stubStreamResponse && stubStreamResponse.kind === "stream");
  const stubEvents = [];
  let stubIndex = 0;
  for await (const event of stubStreamResponse.stream) {
    stubEvents.push(event);
    if (stubIndex === 0) {
      const taskId = event.result.id;
      const cancelResponse = await stubServer.handleRequest("stub-agent", {
        jsonrpc: "2.0",
        id: "stub-cancel",
        method: "tasks/cancel",
        params: { id: taskId },
      });
      assert.equal(cancelResponse.result.status.state, "canceled");
    }
    stubIndex += 1;
  }

  assert.equal(stubEvents.length >= 2, true, "Stub stream missing expected events");
  const stubFinal = stubEvents.at(-1);
  assert.ok(stubFinal, "Missing stub final event");
  assert.equal(stubFinal.result.status.state, "canceled");
  console.log("✅ Cancellation propagation verified with stub agent\n");

  console.log("🎉 All smoke tests passed");
}

run().catch((error) => {
  console.error("❌ Smoke test failed", error);
  process.exitCode = 1;
});
