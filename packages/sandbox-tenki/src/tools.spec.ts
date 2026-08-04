import { describe, expect, it, vi } from "vitest";
import type { TenkiSandbox } from "./sandbox";
import { createTenkiToolkit } from "./tools";

type PreviewParameters = {
  safeParse: (input: unknown) => { success: boolean };
};

const getToolParameters = (name: string): PreviewParameters => {
  const sandbox = {
    getSandbox: vi.fn(),
    authorizeSshKey: vi.fn(),
  } as unknown as TenkiSandbox;
  const tool = createTenkiToolkit(sandbox).tools.find(
    (candidate) => (candidate as { name?: string }).name === name,
  );

  if (!tool) {
    throw new Error(`${name} tool not found`);
  }

  return (tool as { parameters: PreviewParameters }).parameters;
};

const getPreviewParameters = (): PreviewParameters => getToolParameters("expose_preview_url");

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

describe("createTenkiToolkit ssh input schema", () => {
  const getSshParameters = () => getToolParameters("authorize_ssh_key");

  it("accepts a single-line authorized_keys entry", () => {
    expect(
      getSshParameters().safeParse({ publicKey: "ssh-ed25519 AAAAC3NzaC1lZDI1 user@host" }).success,
    ).toBe(true);
  });

  // The value is forwarded verbatim into the authorized_keys set, where a blank
  // entry is meaningless and an embedded newline would author a second key.
  it.each([
    ["empty", ""],
    ["whitespace only", "   "],
    ["newline only", "\n"],
    ["two keys on separate lines", "ssh-ed25519 AAAA a\nssh-ed25519 BBBB b"],
    ["a trailing CRLF line", "ssh-ed25519 AAAA a\r\nssh-ed25519 BBBB b"],
  ])("rejects %s", (_label, publicKey) => {
    expect(getSshParameters().safeParse({ publicKey }).success).toBe(false);
  });
});
