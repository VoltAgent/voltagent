import { A2AMessageSchema } from "./schemas";

describe("A2AMessageSchema", () => {
  it("rejects a message with an empty parts array", () => {
    const result = A2AMessageSchema.safeParse({
      kind: "message",
      role: "user",
      messageId: "msg-1",
      parts: [],
    });

    expect(result.success).toBe(false);
  });

  it("accepts a message with at least one part", () => {
    const result = A2AMessageSchema.safeParse({
      kind: "message",
      role: "user",
      messageId: "msg-1",
      parts: [{ kind: "text", text: "hi" }],
    });

    expect(result.success).toBe(true);
  });
});
