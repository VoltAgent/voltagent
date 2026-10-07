import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ProjectOptions } from "../types";
import { getBaseTemplates } from "../utils/templates";

const baseOptions: ProjectOptions = {
  projectName: "my-agent",
  typescript: true,
  packageManager: "npm",
  features: [],
};

const renderDockerfile = (packageManager: ProjectOptions["packageManager"]) => {
  const template = getBaseTemplates().find((t) => t.targetPath === "Dockerfile");
  if (!template?.transform) {
    throw new Error("Dockerfile template with a transform not found");
  }
  const content = readFileSync(template.sourcePath, "utf-8");
  return template.transform(content, { ...baseOptions, packageManager });
};

describe("Dockerfile template", () => {
  it("renders npm install layers for npm projects", () => {
    const dockerfile = renderDockerfile("npm");
    expect(dockerfile).toContain("RUN npm ci\n");
    expect(dockerfile).toContain("RUN npm ci --omit=dev");
    expect(dockerfile).not.toContain("yarn.lock");
    expect(dockerfile).not.toContain("pnpm-lock.yaml");
  });

  it("copies only the selected package manager lockfile", () => {
    expect(renderDockerfile("yarn")).toContain("COPY yarn.lock* ./");
    expect(renderDockerfile("pnpm")).toContain("COPY pnpm-lock.yaml* ./");
    expect(renderDockerfile("bun")).toContain("COPY bun.lock* ./");

    const yarnDockerfile = renderDockerfile("yarn");
    expect(yarnDockerfile).not.toContain("pnpm-lock.yaml");
    expect(yarnDockerfile).not.toContain("bun.lock");
  });

  it("renders the matching install command per package manager", () => {
    expect(renderDockerfile("yarn")).toContain("yarn install --frozen-lockfile --production");
    expect(renderDockerfile("pnpm")).toContain("pnpm install --frozen-lockfile");
    expect(renderDockerfile("bun")).toContain("bun install --frozen-lockfile");
  });

  it("keeps the package.json copy in both stages", () => {
    const dockerfile = renderDockerfile("npm");
    expect(dockerfile.match(/COPY package\*\.json \.\//g)?.length).toBe(2);
  });
});
