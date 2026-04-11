import { describe, expect, it } from "vitest";
import { buildA2AEndpointPath, buildAgentCardPath } from "./routes";

describe("A2A route helpers", () => {
  it("encodes reserved characters without removing internal spaces", () => {
    expect(buildA2AEndpointPath("support agent/ops?")).toBe("/a2a/support%20agent%2Fops%3F");
    expect(buildAgentCardPath("support agent/ops?")).toBe(
      "/.well-known/support%20agent%2Fops%3F/agent-card.json",
    );
  });
});
