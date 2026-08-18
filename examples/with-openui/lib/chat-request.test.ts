import { describe, expect, it } from "vitest";
import { parseChatRequest } from "./chat-request";

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
});
