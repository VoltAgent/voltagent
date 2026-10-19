import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { safeStringify } from "@voltagent/internal";
import { describe, expect, it } from "vitest";

describe("MiniMax compatible SDK defaults", () => {
  for (const baseURL of ["https://api.minimax.io/v1", "https://api.minimaxi.com/v1"]) {
    for (const modelId of ["MiniMax-M3.1-Flash", "MiniMax-M3"]) {
      it(`preserves API thinking defaults for ${modelId} at ${baseURL}`, async () => {
        let request: Record<string, unknown> = {};
        const provider = createOpenAICompatible({
          name: "minimax",
          baseURL,
          apiKey: "test-key",
          fetch: async (url, init) => {
            expect(String(url)).toBe(`${baseURL}/chat/completions`);
            request = JSON.parse(init?.body as string);
            return new Response(
              safeStringify({
                id: "test",
                model: modelId,
                created: 1,
                choices: [
                  {
                    index: 0,
                    message: { role: "assistant", content: "hello" },
                    finish_reason: "stop",
                  },
                ],
                usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
              }),
              { headers: { "Content-Type": "application/json" } },
            );
          },
        });
        await provider.chatModel(modelId).doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
        });
        expect(request.model).toBe(modelId);
        expect(request.thinking).toBeUndefined();
        expect(request.reasoning_effort).toBeUndefined();
        expect(request.service_tier).toBeUndefined();
        expect(request.reasoning_split).not.toBe(false);
      });
    }
  }
});
