import { execSync } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getInstalledPackageManagers,
  getPackageManagerVersion,
  supportsDockerfile,
} from "./package-manager";

vi.mock("node:child_process", () => ({ execSync: vi.fn() }));

describe("package manager detection", () => {
  beforeEach(() => {
    vi.mocked(execSync).mockImplementation((command) =>
      String(command).endsWith("yarn --version") ? "1.22.22\n" : "",
    );
  });

  it("accepts Yarn Classic and records its version", () => {
    expect(getInstalledPackageManagers()).toContain("yarn");
    expect(getPackageManagerVersion("yarn")).toBe("1.22.22");
  });

  it("keeps Yarn Modern available for explicit Docker compatibility handling", () => {
    vi.mocked(execSync).mockImplementation((command) =>
      String(command).endsWith("yarn --version") ? "4.9.0\n" : "",
    );
    expect(getInstalledPackageManagers()).toContain("yarn");
    expect(supportsDockerfile("yarn", "4.9.0")).toBe(false);
    expect(supportsDockerfile("yarn", "1.22.22")).toBe(true);
  });

  it("accepts prerelease manager versions for Docker pinning", () => {
    vi.mocked(execSync).mockImplementation((command) =>
      String(command).endsWith("bun --version") ? "1.4.0-canary.1\n" : "",
    );
    expect(getPackageManagerVersion("bun")).toBe("1.4.0-canary.1");
  });

  it("skips Yarn when its version probe fails", () => {
    vi.mocked(execSync).mockImplementation((command) => {
      if (String(command).endsWith("yarn --version")) {
        throw new Error("yarn failed to start");
      }
      return "";
    });
    expect(getInstalledPackageManagers()).not.toContain("yarn");
  });
});
