import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalSandbox, detectLocalSandboxIsolation } from "./local";

const runNodeScript = async (sandbox: LocalSandbox, script: string) => {
  return await sandbox.execute({
    command: process.execPath,
    args: ["-e", script],
  });
};

const pathExists = async (target: string): Promise<boolean> => {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
};

const waitForRemoval = async (target: string): Promise<void> => {
  for (let i = 0; i < 20; i += 1) {
    if (!(await pathExists(target))) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

describe("LocalSandbox defaults", () => {
  const originalSecret = process.env.VOLTAGENT_TEST_SECRET;

  beforeEach(() => {
    process.env.VOLTAGENT_TEST_SECRET = "secret-value";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      process.env.VOLTAGENT_TEST_SECRET = undefined;
    } else {
      process.env.VOLTAGENT_TEST_SECRET = originalSecret;
    }
  });

  it("passes only PATH by default", async () => {
    const sandbox = new LocalSandbox();
    const result = await runNodeScript(
      sandbox,
      [
        "console.log(process.env.VOLTAGENT_TEST_SECRET ?? 'missing')",
        "console.log(process.env.PATH ? 'path' : 'no-path')",
      ].join(";"),
    );

    const [secretLine, pathLine] = result.stdout
      .trim()
      .split("\n")
      .map((line) => line.trim());
    expect(secretLine).toBe("missing");
    expect(pathLine).toBe("path");
  });

  it("passes full env when inheritProcessEnv is true", async () => {
    const sandbox = new LocalSandbox({ inheritProcessEnv: true });
    const result = await runNodeScript(
      sandbox,
      [
        "console.log(process.env.VOLTAGENT_TEST_SECRET ?? 'missing')",
        "console.log(process.env.PATH ? 'path' : 'no-path')",
      ].join(";"),
    );

    const [secretLine, pathLine] = result.stdout
      .trim()
      .split("\n")
      .map((line) => line.trim());
    expect(secretLine).toBe("secret-value");
    expect(pathLine).toBe("path");
  });
});

describe("LocalSandbox cleanupOnDestroy", () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it("cleans the auto-created root directory on destroy", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "voltagent-sandbox-"));
    process.chdir(tempDir);

    const sandbox = new LocalSandbox({ cleanupOnDestroy: true });
    await runNodeScript(sandbox, "console.log('ready')");

    const rootDir = path.join(tempDir, ".sandbox");
    expect(await pathExists(rootDir)).toBe(true);

    sandbox.destroy();
    await waitForRemoval(rootDir);
    expect(await pathExists(rootDir)).toBe(false);

    await fs.rm(tempDir, { recursive: true, force: true });
  });
});

describe("LocalSandbox isolation helpers", () => {
  const originalPath = process.env.PATH;

  afterEach(() => {
    if (originalPath === undefined) {
      process.env.PATH = undefined;
    } else {
      process.env.PATH = originalPath;
    }
  });

  it("detects none when PATH is empty", async () => {
    process.env.PATH = "";
    const result = await detectLocalSandboxIsolation();
    expect(result).toBe("none");
  });

  it("throws for unsupported bwrap on non-linux", async () => {
    if (process.platform === "linux") {
      return;
    }
    const sandbox = new LocalSandbox({
      isolation: { provider: "bwrap" },
    });

    await expect(
      sandbox.execute({
        command: "echo",
        args: ["test"],
      }),
    ).rejects.toThrow("bwrap isolation is only supported on Linux");
  });

  it("throws for unsupported sandbox-exec on non-darwin", async () => {
    if (process.platform === "darwin") {
      return;
    }
    const sandbox = new LocalSandbox({
      isolation: { provider: "sandbox-exec" },
    });

    await expect(
      sandbox.execute({
        command: "echo",
        args: ["test"],
      }),
    ).rejects.toThrow("sandbox-exec isolation is only supported on macOS");
  });
});
