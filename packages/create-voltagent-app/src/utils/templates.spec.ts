import { describe, expect, it } from "vitest";
import type { ProjectOptions } from "../types";
import { getBaseTemplates } from "./templates";

describe("Dockerfile template compatibility", () => {
  it("reports that Yarn Modern Docker generation is unsupported", () => {
    const dockerfileTemplate = getBaseTemplates().find(
      (template) => template.targetPath === "Dockerfile",
    );
    const options = {
      projectName: "example",
      typescript: true,
      packageManager: "yarn",
      packageManagerVersion: "4.9.0",
      features: [],
    } satisfies ProjectOptions;

    expect(() => dockerfileTemplate?.transform?.("", options)).toThrow(
      "Docker generation currently supports Yarn Classic (1.x) only.",
    );
  });
});
