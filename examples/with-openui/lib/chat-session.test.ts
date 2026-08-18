import { describe, expect, it } from "vitest";
import { anonymousUserCookie, deriveConversationId, resolveAnonymousSession } from "./chat-session";

const generatedId = "123e4567-e89b-42d3-a456-426614174000";
const existingId = "d9428888-122b-4bf0-a331-2c6f1a6a2182";

describe("anonymous chat sessions", () => {
  it("issues an HttpOnly cookie for a new anonymous visitor", () => {
    const session = resolveAnonymousSession(null, () => generatedId);

    expect(session.userId).toBe(`anonymous:${generatedId}`);
    expect(session.setCookie).toContain(`${anonymousUserCookie}=${generatedId}`);
    expect(session.setCookie).toContain("HttpOnly");
    expect(session.setCookie).toContain("SameSite=Lax");
  });

  it("reuses only a valid server-issued anonymous identifier", () => {
    const existing = resolveAnonymousSession(
      `theme=dark; ${anonymousUserCookie}=${existingId}`,
      () => generatedId,
    );
    const invalid = resolveAnonymousSession(
      `${anonymousUserCookie}=predictable`,
      () => generatedId,
    );

    expect(existing).toEqual({ userId: `anonymous:${existingId}`, setCookie: undefined });
    expect(invalid.userId).toBe(`anonymous:${generatedId}`);
    expect(invalid.setCookie).toContain(`${anonymousUserCookie}=${generatedId}`);
  });

  it("derives separate conversation IDs for each visitor and client thread", () => {
    const first = deriveConversationId(`anonymous:${existingId}`, "thread-a");

    expect(first).toBe(deriveConversationId(`anonymous:${existingId}`, "thread-a"));
    expect(first).not.toBe(deriveConversationId(`anonymous:${generatedId}`, "thread-a"));
    expect(first).not.toBe(deriveConversationId(`anonymous:${existingId}`, "thread-b"));
    expect(first).not.toContain("thread-a");
  });
});
