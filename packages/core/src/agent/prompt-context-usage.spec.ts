import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  estimatePromptContextUsage,
  promptContextUsageEstimateToAttributes,
} from "./prompt-context-usage";

describe("prompt context usage estimation", () => {
  it("estimates system, message, and tool context separately", () => {
    const estimate = estimatePromptContextUsage({
      messages: [
        {
          role: "system",
          content: "You are a careful assistant.",
        },
        {
          role: "user",
          content: "Summarize the latest release notes.",
        },
        {
          role: "assistant",
          content: [{ type: "text", text: "Let me inspect them." }],
        },
      ],
      tools: {
        searchDocs: {
          description: "Search the documentation",
          inputSchema: z.object({
            query: z.string(),
            topK: z.number().int().optional(),
          }),
        },
      },
    });

    expect(estimate).toBeDefined();
    expect(estimate?.systemMessageCount).toBe(1);
    expect(estimate?.toolCount).toBe(1);
    expect(estimate?.systemTokensEstimated).toBeGreaterThan(0);
    expect(estimate?.nonSystemMessageTokensEstimated).toBeGreaterThan(0);
    expect(estimate?.toolTokensEstimated).toBeGreaterThan(0);
    expect(estimate?.messageTokensEstimated).toBe(
      (estimate?.systemTokensEstimated ?? 0) + (estimate?.nonSystemMessageTokensEstimated ?? 0),
    );
    expect(estimate?.totalTokensEstimated).toBe(
      (estimate?.messageTokensEstimated ?? 0) + (estimate?.toolTokensEstimated ?? 0),
    );
  });

  it("returns prompt context usage span attributes", () => {
    const attributes = promptContextUsageEstimateToAttributes({
      systemTokensEstimated: 12,
      messageTokensEstimated: 34,
      nonSystemMessageTokensEstimated: 22,
      toolTokensEstimated: 18,
      totalTokensEstimated: 52,
      systemMessageCount: 1,
      toolCount: 2,
    });

    expect(attributes).toEqual({
      "usage.prompt_context.system_tokens_estimated": 12,
      "usage.prompt_context.message_tokens_estimated": 34,
      "usage.prompt_context.non_system_message_tokens_estimated": 22,
      "usage.prompt_context.tool_tokens_estimated": 18,
      "usage.prompt_context.total_tokens_estimated": 52,
      "usage.prompt_context.system_message_count": 1,
      "usage.prompt_context.tool_count": 2,
    });
  });

  it("sanitizes nested binary args recursively and ignores provider-only metadata", () => {
    const circularArgsA: Record<string, unknown> = {
      content: {
        metadata: {
          data: "x".repeat(8_000),
        },
      },
      attachments: [{ image: "y".repeat(8_000) }],
    };
    circularArgsA.self = circularArgsA;

    const circularArgsB: Record<string, unknown> = {
      content: {
        metadata: {
          data: "short",
        },
      },
      attachments: [{ image: "tiny" }],
    };
    circularArgsB.self = circularArgsB;

    const toolAEstimate = estimatePromptContextUsage({
      tools: {
        searchDocs: {
          description: "Search the documentation",
          inputSchema: z.object({ query: z.string() }),
          outputSchema: z.object({ answer: z.string() }),
          providerOptions: {
            openai: {
              metadata: "provider-only".repeat(2_000),
            },
          },
          needsApproval: true,
          args: circularArgsA,
        },
      },
    });

    const toolBEstimate = estimatePromptContextUsage({
      tools: {
        searchDocs: {
          description: "Search the documentation",
          inputSchema: z.object({ query: z.string() }),
          outputSchema: z.object({ answer: z.string() }),
          providerOptions: {
            openai: {
              metadata: "ignored",
            },
          },
          needsApproval: false,
          args: circularArgsB,
        },
      },
    });

    expect(toolAEstimate?.toolTokensEstimated).toBeGreaterThan(0);
    expect(toolAEstimate?.toolTokensEstimated).toBe(toolBEstimate?.toolTokensEstimated);
  });

  it("ignores non-plain args values when estimating tool tokens", () => {
    const withArrayArgs = estimatePromptContextUsage({
      tools: {
        searchDocs: {
          description: "Search the documentation",
          inputSchema: z.object({ query: z.string() }),
          args: ["x".repeat(10_000)],
        },
      },
    });

    const withoutArgs = estimatePromptContextUsage({
      tools: {
        searchDocs: {
          description: "Search the documentation",
          inputSchema: z.object({ query: z.string() }),
        },
      },
    });

    expect(withArrayArgs?.toolTokensEstimated).toBe(withoutArgs?.toolTokensEstimated);
  });
});
