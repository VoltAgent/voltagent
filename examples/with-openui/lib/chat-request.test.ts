import { describe, expect, it } from "vitest";
import {
  InvalidChatRequestError,
  MAX_CHAT_REQUEST_BYTES,
  parseChatRequest,
  parseChatRequestBody,
} from "./chat-request";

describe("parseChatRequest", () => {
  it("preserves a follow-up action as the next VoltAgent user turn", () => {
    const content =
      '<content>Compare borough permit trends</content><context>["User clicked: Compare borough permit trends"]</context>';

    const result = parseChatRequest({
      threadId: "acceptance-thread",
      messages: [{ role: "user", content }],
    });

    expect(result.messages[0]?.content).toBe(content);
  });

  it("preserves distinctive form values in the action context", () => {
    const content =
      '<content>Analyze the submitted housing focus for the specified audience using exact PDF facts and page citations</content><context>["User clicked: Analyze the submitted housing focus for the specified audience using exact PDF facts and page citations",{"housingAnalysis":{"focusArea":"Vacancy rates","audience":"City planners","notes":"Compare borough differences"}}]</context>';

    const result = parseChatRequest({
      threadId: "acceptance-thread",
      messages: [{ role: "user", content }],
    });

    expect(result.messages[0]?.content).toContain("Vacancy rates");
    expect(result.messages[0]?.content).toContain("Compare borough differences");
  });

  it("rejects malformed JSON as an invalid chat request", async () => {
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: "{",
      headers: { "Content-Type": "application/json" },
    });

    await expect(parseChatRequestBody(request)).rejects.toBeInstanceOf(InvalidChatRequestError);
  });

  it("rejects a declared oversized body before reading it", async () => {
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: "{}",
      headers: { "Content-Length": String(MAX_CHAT_REQUEST_BYTES + 1) },
    });

    await expect(parseChatRequestBody(request)).rejects.toBeInstanceOf(InvalidChatRequestError);
    expect(request.bodyUsed).toBe(false);
  });

  it("stops reading a chunked body when it exceeds the byte limit", async () => {
    const chunk = new Uint8Array(256 * 1024);
    let chunksRead = 0;
    const body = new ReadableStream({
      pull(controller) {
        chunksRead += 1;
        controller.enqueue(chunk);
      },
    });
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(parseChatRequestBody(request)).rejects.toBeInstanceOf(InvalidChatRequestError);
    expect(chunksRead).toBe(5);
  });
});
