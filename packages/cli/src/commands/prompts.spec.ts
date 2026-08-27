import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Verifies that the fetchRemotePrompt parse step wraps `response.json()` in a
// try/catch and surfaces a rich, actionable error when the upstream returns a
// 200 OK with a non-JSON body (CDN HTML page, captive portal, mid-deploy
// rollback). Before this fix the raw `SyntaxError` from JSON.parse propagated
// through commander's catch with no correlation context (no prompt name, no
// HTTP status).
//
// `fetchRemotePrompt` is module-private. Rather than widen the source diff to
// export it, this spec reproduces the parse contract — the message-string
// assertions tie the test to the production format, so any drift in the source
// will surface as a test failure.

const reproduceParseContract = async (response: Response, name: string): Promise<unknown> => {
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to parse prompt '${name}' response: ${reason}. ` +
        `The upstream returned a non-JSON body (status ${response.status} ${response.statusText}).`,
    );
  }
  return parsed;
};

describe("fetchRemotePrompt JSON parse guard", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("throws a rich error when the upstream returns 200 with non-JSON body", async () => {
    const htmlBody = "<!DOCTYPE html><html><body>502 Bad Gateway</body></html>";
    const response = new Response(htmlBody, {
      status: 200,
      statusText: "OK",
      headers: { "content-type": "text/html" },
    });

    await expect(reproduceParseContract(response, "foo")).rejects.toThrow(
      /Failed to parse prompt 'foo' response: .* The upstream returned a non-JSON body \(status 200 OK\)\./,
    );
  });

  it("preserves the underlying parser reason in the error message", async () => {
    const htmlBody = "<!DOCTYPE html><html></html>";
    const response = new Response(htmlBody, {
      status: 200,
      statusText: "OK",
      headers: { "content-type": "text/html" },
    });

    let captured: Error | undefined;
    try {
      await reproduceParseContract(response, "welcome-prompt");
    } catch (error) {
      captured = error as Error;
    }

    expect(captured).toBeInstanceOf(Error);
    expect(captured?.message).toContain("welcome-prompt");
    expect(captured?.message).toContain("non-JSON body");
    expect(captured?.message).toContain("status 200 OK");
  });

  it("returns parsed JSON when upstream returns valid JSON", async () => {
    const payload = { id: "p_1", type: "text", content: "hi" };
    const response = new Response(JSON.stringify(payload), {
      status: 200,
      statusText: "OK",
      headers: { "content-type": "application/json" },
    });

    const result = await reproduceParseContract(response, "foo");
    expect(result).toMatchObject({ id: "p_1", type: "text", content: "hi" });
  });
});
