import { randomUUID } from "node:crypto";
import { Workspace } from "@voltagent/core";
import { Machine } from "smolmachines";
import { describe, expect, it } from "vitest";
import { SmolMachinesSandbox } from "./index";

// Boots a real machine, so it runs only where the local engine can (macOS Apple Silicon, Linux x64 or arm64 with KVM).
const canBoot = Machine.localAvailability().available;

describe.skipIf(!canBoot)("SmolMachinesSandbox on a real machine", () => {
  it("runs commands in a workspace and deletes the machine on destroy", async () => {
    const name = `voltagent-e2e-${randomUUID().slice(0, 8)}`;
    const sandbox = new SmolMachinesSandbox({ config: { name } });
    const workspace = new Workspace({ sandbox });

    try {
      const uname = await workspace.sandbox?.execute({ command: "uname -s" });
      expect(uname).toMatchObject({ stdout: "Linux\n", exitCode: 0, timedOut: false });

      const shell = await workspace.sandbox?.execute({
        command: "sh",
        args: ["-c", 'echo out; echo "$GREETING from $(pwd)" >&2; exit 4'],
        env: { GREETING: "hi" },
        cwd: "/tmp",
      });
      expect(shell).toMatchObject({ stdout: "out\n", stderr: "hi from /tmp\n", exitCode: 4 });

      const slow = await workspace.sandbox?.execute({ command: "sleep 30", timeoutMs: 1000 });
      expect(slow).toMatchObject({ timedOut: true, exitCode: null });
      expect(slow?.durationMs).toBeLessThan(10000);
      const left = await workspace.sandbox?.execute({ command: "pgrep", args: ["sleep"] });
      expect(left?.stdout).toBe("");

      // 12 MB is past the engine's 11 MiB stream cap.
      const flood = await workspace.sandbox?.execute({
        command: "head",
        args: ["-c", "12000000", "/dev/zero"],
        maxOutputBytes: 1000,
      });
      expect(flood).toMatchObject({ stdoutTruncated: true, timedOut: false });
      expect(flood?.stdout).toHaveLength(1000);

      // Destroying the workspace under a running command deletes the machine and rejects the call.
      let started: () => void = () => undefined;
      const running = new Promise<void>((resolve) => {
        started = resolve;
      });
      const outcome = workspace.sandbox
        ?.execute({
          command: "sh",
          args: ["-c", "echo started; sleep 30"],
          timeoutMs: 0,
          onStdout: () => started(),
        })
        .then(() => "resolved")
        .catch((error: Error) => error.message);
      await running;
      const destroyedAt = Date.now();
      await workspace.destroy();
      expect(await outcome).toMatch(/connection closed/);
      expect(Date.now() - destroyedAt).toBeLessThan(5000);
    } finally {
      await workspace.destroy();
    }

    const names = (await Machine.list({ target: "local" })).map((machine) => machine.name);
    expect(names).not.toContain(name);
  }, 120000);
});
