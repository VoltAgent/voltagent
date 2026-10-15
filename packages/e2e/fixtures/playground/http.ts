import { safeStringify } from "@voltagent/internal";
import { type UIMessage, type UIMessageChunk, readUIMessageStream } from "ai";

const base = process.env.PLAYGROUND_TEST_URL ?? "http://localhost:3141";
export type Event = { type: string; [key: string]: unknown };

export async function request(path: string, body?: unknown, signal?: AbortSignal) {
  return fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : safeStringify(body),
    signal: signal ?? AbortSignal.timeout(20000),
  });
}

export async function json<T = Record<string, unknown>>(path: string, body?: unknown): Promise<T> {
  const response = await request(path, body);
  const payload = await response.json();
  if (!response.ok || payload.success === false) throw new Error(safeStringify(payload));
  return payload.data as T;
}

export async function events(
  response: Response,
  until?: (event: Event) => boolean,
): Promise<Event[]> {
  if (!response.ok) throw new Error(await response.text());
  if (!response.body) throw new Error("Missing stream body");
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  const collected: Event[] = [];
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
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
          const event = JSON.parse(data) as Event;
          collected.push(event);
          if (until?.(event)) return collected;
        }
        boundary = /\r?\n\r?\n/.exec(buffer);
      }
    }
    return collected;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export const userMessage = (text: string): UIMessage => ({
  id: crypto.randomUUID(),
  role: "user",
  parts: [{ type: "text", text }],
});

export async function conversationSpans(agentId: string, conversationId: string) {
  type Span = {
    name: string;
    startTime: string;
    endTime?: string;
    status: { code: number };
    attributes: Record<string, unknown>;
  };
  const data = await json<{ traces: Array<{ spans: Span[] }> }>(
    `/observability/traces?entityId=${agentId}&entityType=agent`,
  );
  return data.traces
    .filter((trace) =>
      trace.spans.some((span) => span.attributes["conversation.id"] === conversationId),
    )
    .flatMap((trace) => trace.spans);
}

export async function chat(
  id: string,
  input: UIMessage[] = [userMessage("Run this demo")],
  context = {},
  conversationId = crypto.randomUUID(),
) {
  const chunks = await events(
    await request(`/agents/${id}/chat`, {
      input,
      options: { voltagent: { context, userId: "scenario-test", conversationId } },
    }),
  );
  let message: UIMessage | undefined;
  const stream = new ReadableStream<UIMessageChunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk as UIMessageChunk);
      controller.close();
    },
  });
  for await (const next of readUIMessageStream({ stream, onError: () => {} })) message = next;
  return {
    chunks,
    message,
    text: chunks
      .filter((part) => part.type === "text-delta")
      .map((part) => part.delta)
      .join(""),
  };
}

export async function workflow(id: string, input: unknown = {}) {
  const stream = await events(
    await request(`/workflows/${id}/stream`, { input }),
    (event) => event.type === "workflow-suspended",
  );
  const terminal = stream.findLast(
    (event) => event.type === "workflow-result" || event.type === "workflow-suspended",
  );
  if (!terminal) throw new Error(`Missing workflow outcome: ${safeStringify(stream)}`);
  return { stream, terminal, executionId: String(terminal.executionId) };
}
