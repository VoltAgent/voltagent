import { describe, expect, it, vi } from "vitest";
import type { TenkiSandbox } from "./sandbox";
import { createTenkiToolkit } from "./tools";

type PreviewParameters = {
  safeParse: (input: unknown) => { success: boolean };
};

const getPreviewParameters = (): PreviewParameters => {
  const sandbox = {
    getSandbox: vi.fn(),
    authorizeSshKey: vi.fn(),
  } as unknown as TenkiSandbox;
  const previewTool = createTenkiToolkit(sandbox).tools.find(
    (tool) => (tool as { name?: string }).name === "expose_preview_url",
  );

  if (!previewTool) {
    throw new Error("expose_preview_url tool not found");
  }

  return (previewTool as { parameters: PreviewParameters }).parameters;
};

describe("createTenkiToolkit preview input schema", () => {
  it.each([1, 65535])("accepts boundary port %s", (port) => {
    expect(getPreviewParameters().safeParse({ port }).success).toBe(true);
  });

  it.each([0, -1, 65536, 1.5])("rejects invalid port %s", (port) => {
    expect(getPreviewParameters().safeParse({ port }).success).toBe(false);
  });

  it("accepts an omitted or positive integer TTL", () => {
    const parameters = getPreviewParameters();

    expect(parameters.safeParse({ port: 3000 }).success).toBe(true);
    expect(parameters.safeParse({ port: 3000, ttlMs: 1 }).success).toBe(true);
  });

  it.each([0, -1, 1.5])("rejects invalid TTL %s", (ttlMs) => {
    expect(getPreviewParameters().safeParse({ port: 3000, ttlMs }).success).toBe(false);
  });
});
