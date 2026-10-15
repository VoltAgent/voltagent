import { describe, expect, it } from "vitest";
import { callOptions, initialSettings } from "../components/settings";
import { schemaSample } from "./schema";

describe("schema inputs and settings", () => {
  it("preserves typed defaults and includes required fields without inventing optional ones", () => {
    expect(
      schemaSample({
        type: "object",
        required: ["city", "choice"],
        properties: {
          city: { type: "string" },
          choice: { enum: [false, true] },
          limit: { type: "number", default: 0 },
          extra: { type: "string" },
          options: { default: { nested: [1, false] } },
        },
      }),
    ).toEqual({ city: "", choice: false, limit: 0, options: { nested: [1, false] } });
  });
  it("keeps SDK limits and provider options separate from typed runtime context", () => {
    const result = callOptions({
      ...initialSettings(),
      maxOutputTokens: "1000",
      resumableStream: "on",
      context: '{"enabled":false,"count":0,"items":[1]}',
      providerOptions: '{"custom":{"nested":{"value":true}}}',
    });
    expect(result).toMatchObject({
      maxOutputTokens: 1000,
      providerOptions: { custom: { nested: { value: true } } },
      voltagent: { resumableStream: true, context: { enabled: false, count: 0, items: [1] } },
    });
    expect(() => callOptions({ ...initialSettings(), maxOutputTokens: "1.5" })).toThrow(
      "positive integer",
    );
  });
});
