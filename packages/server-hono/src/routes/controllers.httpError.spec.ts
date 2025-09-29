import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAPIHono } from "../zod-openapi-compat";
import { registerAgentRoutes } from "./index";

// Partially mock server-core to override only the handlers we need for tests
vi.mock("@voltagent/server-core", async () => {
  const actual =
    await vi.importActual<typeof import("@voltagent/server-core")>("@voltagent/server-core");
  return {
    ...actual,
    handleGenerateText: vi.fn(),
    handleGenerateObject: vi.fn(),
  };
});

// Grab the mocked functions with proper typing without top-level await (CJS-compatible)
let mockedHandleGenerateText: ReturnType<typeof vi.fn>;
let mockedHandleGenerateObject: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  const mockedCore = await import("@voltagent/server-core");
  mockedHandleGenerateText = mockedCore.handleGenerateText as unknown as ReturnType<typeof vi.fn>;
  mockedHandleGenerateObject = mockedCore.handleGenerateObject as unknown as ReturnType<
    typeof vi.fn
  >;
});

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as any;

function makeApp() {
  const app = new OpenAPIHono();
  registerAgentRoutes(app as any, {} as any, logger);
  return app;
}

describe("server-hono controllers: httpError/httpStatus mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /agents/:id/text should use httpStatus from handler error and return details without httpStatus", async () => {
    mockedHandleGenerateText.mockResolvedValueOnce({
      success: false,
      error: "Quota exceeded for web-search",
      code: "TOOL_QUOTA_EXCEEDED",
      name: "web-search",
      httpStatus: 429,
    });

    const app = makeApp();

    const res = await app.request("/agents/agent-1/text", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: "hi" }),
    });

    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json).toMatchObject({
      success: false,
      error: "Quota exceeded for web-search",
      code: "TOOL_QUOTA_EXCEEDED",
      name: "web-search",
    });
    // httpStatus should not be included in the response body
    expect((json as any).httpStatus).toBeUndefined();
  });

  it("POST /agents/:id/text should default to 500 when handler error has no httpStatus", async () => {
    mockedHandleGenerateText.mockResolvedValueOnce({
      success: false,
      error: "Model timeout",
    });

    const app = makeApp();

    const res = await app.request("/agents/agent-1/text", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: "hi" }),
    });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toMatchObject({
      success: false,
      error: "Model timeout",
    });
    expect((json as any).httpStatus).toBeUndefined();
  });

  it("POST /agents/:id/object should use httpStatus from handler error and return details without httpStatus", async () => {
    mockedHandleGenerateObject.mockResolvedValueOnce({
      success: false,
      error: "Invalid JSON schema",
      code: "SCHEMA_ERROR",
      name: "object-gen",
      httpStatus: 400,
    });

    const app = makeApp();

    const res = await app.request("/agents/agent-1/object", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: "{}" }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toMatchObject({
      success: false,
      error: "Invalid JSON schema",
      code: "SCHEMA_ERROR",
      name: "object-gen",
    });
    expect((json as any).httpStatus).toBeUndefined();
  });

  it("POST /agents/:id/object should default to 500 when handler error has no httpStatus", async () => {
    mockedHandleGenerateObject.mockResolvedValueOnce({
      success: false,
      error: "Unknown failure",
    });

    const app = makeApp();

    const res = await app.request("/agents/agent-1/object", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: "{}" }),
    });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toMatchObject({
      success: false,
      error: "Unknown failure",
    });
    expect((json as any).httpStatus).toBeUndefined();
  });
});
