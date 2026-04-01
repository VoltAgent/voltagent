import type { ModelMessage } from "@ai-sdk/provider-utils";
import { describe, expect, it } from "vitest";

import { stripDanglingOpenAIReasoningFromModelMessages } from "./model-message-normalizer";

describe("model-message-normalizer", () => {
  it("drops dangling OpenAI reasoning items", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "reasoning",
            text: "",
            providerOptions: { openai: { itemId: "rs_only" } },
          },
        ],
      } as ModelMessage,
      {
        role: "user",
        content: "hello",
      },
    ];

    const sanitized = stripDanglingOpenAIReasoningFromModelMessages(messages);

    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].role).toBe("user");
  });

  it("drops reasoning when the next part lacks an OpenAI itemId", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "reasoning",
            text: "",
            providerOptions: { openai: { itemId: "rs_drop" } },
          },
          {
            type: "text",
            text: "keep this",
          },
        ],
      } as ModelMessage,
    ];

    const sanitized = stripDanglingOpenAIReasoningFromModelMessages(messages);
    const content = sanitized[0].content as any[];

    expect(content).toHaveLength(1);
    expect(content[0]).toEqual({ type: "text", text: "keep this" });
  });

  it("keeps reasoning when followed by an OpenAI itemId part", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "reasoning",
            text: "",
            providerOptions: { openai: { itemId: "rs_keep" } },
          },
          {
            type: "text",
            text: "paired",
            providerOptions: { openai: { itemId: "msg_keep" } },
          },
        ],
      } as ModelMessage,
    ];

    const sanitized = stripDanglingOpenAIReasoningFromModelMessages(messages);
    const content = sanitized[0].content as any[];

    expect(content).toHaveLength(2);
    expect(content[0].type).toBe("reasoning");
    expect(content[1].type).toBe("text");
  });

  it("drops earlier reasoning when another reasoning follows", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "reasoning",
            text: "",
            providerOptions: { openai: { itemId: "rs_first" } },
          },
          {
            type: "reasoning",
            text: "",
            providerOptions: { openai: { itemId: "rs_second" } },
          },
          {
            type: "text",
            text: "paired",
            providerOptions: { openai: { itemId: "msg_keep" } },
          },
        ],
      } as ModelMessage,
    ];

    const sanitized = stripDanglingOpenAIReasoningFromModelMessages(messages);
    const content = sanitized[0].content as any[];

    expect(content).toHaveLength(2);
    expect(content[0].providerOptions).toEqual({ openai: { itemId: "rs_second" } });
    expect(content[1].type).toBe("text");
  });
});
