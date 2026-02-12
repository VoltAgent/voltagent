import { describe, expect, it } from "vitest";
import { coerceStringifiedJsonToolArgs } from "./tool-input-coercion";

describe("coerceStringifiedJsonToolArgs", () => {
  it("coerces stringified arrays for invalid_type issues", () => {
    const raw = {
      command: "python3",
      args: '["parse_excel.py"]',
    };

    const coerced = coerceStringifiedJsonToolArgs(raw, [
      {
        code: "invalid_type",
        expected: "array",
        received: "string",
        path: ["args"],
      },
    ]);

    expect(coerced).toEqual({
      command: "python3",
      args: ["parse_excel.py"],
    });
  });

  it("coerces stringified nested objects for invalid_type issues", () => {
    const raw = {
      tool: "search",
      payload: {
        query: "volt",
        filters: '{"owner":"workspace"}',
      },
    };

    const coerced = coerceStringifiedJsonToolArgs(raw, [
      {
        code: "invalid_type",
        expected: "object",
        received: "string",
        path: ["payload", "filters"],
      },
    ]);

    expect(coerced).toEqual({
      tool: "search",
      payload: {
        query: "volt",
        filters: {
          owner: "workspace",
        },
      },
    });
  });

  it("returns null when no coercion is needed", () => {
    const raw = {
      command: "python3",
      args: "not-json",
    };

    const coerced = coerceStringifiedJsonToolArgs(raw, [
      {
        code: "invalid_type",
        expected: "array",
        received: "string",
        path: ["args"],
      },
    ]);

    expect(coerced).toBeNull();
  });
});
