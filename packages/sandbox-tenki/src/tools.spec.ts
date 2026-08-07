import { describe, expect, it, vi } from "vitest";
import { type TenkiToolkitSandbox, createTenkiToolkit } from "./tools";

type ToolParameters = {
  safeParse: (input: unknown) => { success: boolean };
};

const getToolParameters = (name: string): ToolParameters => {
  const sandbox: TenkiToolkitSandbox = {
    getSandbox: vi.fn(),
    authorizeSshKey: vi.fn(),
  };
  const tool = createTenkiToolkit(sandbox).tools.find(
    (candidate) => (candidate as { name?: string }).name === name,
  );

  if (!tool) {
    throw new Error(`${name} tool not found`);
  }

  return (tool as { parameters: ToolParameters }).parameters;
};

describe("createTenkiToolkit preview input schema", () => {
  it.each([1, 65535])("accepts boundary port %s", (port) => {
    expect(getToolParameters("expose_preview_url").safeParse({ port }).success).toBe(true);
  });

  it.each([0, -1, 65536, 1.5])("rejects invalid port %s", (port) => {
    expect(getToolParameters("expose_preview_url").safeParse({ port }).success).toBe(false);
  });

  it("accepts an omitted or positive integer TTL", () => {
    const parameters = getToolParameters("expose_preview_url");

    expect(parameters.safeParse({ port: 3000 }).success).toBe(true);
    expect(parameters.safeParse({ port: 3000, ttlMs: 1 }).success).toBe(true);
  });

  it.each([0, -1, 1.5])("rejects invalid TTL %s", (ttlMs) => {
    expect(getToolParameters("expose_preview_url").safeParse({ port: 3000, ttlMs }).success).toBe(
      false,
    );
  });
});

describe("createTenkiToolkit ssh key input schema", () => {
  it("accepts a single-line authorized_keys entry", () => {
    expect(
      getToolParameters("authorize_ssh_key").safeParse({ publicKey: "ssh-ed25519 AAAA user" })
        .success,
    ).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["whitespace-only", "   "],
    ["multiline", "ssh-ed25519 AAAA\nssh-rsa BBBB"],
    ["carriage return", "ssh-ed25519 AAAA\r\n"],
  ])("rejects a %s public key", (_label, publicKey) => {
    expect(getToolParameters("authorize_ssh_key").safeParse({ publicKey }).success).toBe(false);
  });
});
