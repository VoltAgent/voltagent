import { execSync } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getInstalledPackageManagers, getPackageManagerVersion } from "./package-manager";

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

  it("does not offer Yarn Modern for a Docker scaffold", () => {
    vi.mocked(execSync).mockImplementation((command) =>
      String(command).endsWith("yarn --version") ? "4.9.0\n" : "",
    );
    expect(getInstalledPackageManagers()).not.toContain("yarn");
  });
});
