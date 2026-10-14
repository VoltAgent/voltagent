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

  it.each([
    ["npm", "", "RUN npm ci", "RUN npm ci --omit=dev"],
    [
      "yarn",
      "yarn.lock",
      "RUN yarn install --frozen-lockfile",
      "RUN yarn install --frozen-lockfile --production",
    ],
    [
      "pnpm",
      "pnpm-lock.yaml",
      "RUN npm install -g pnpm && pnpm install --frozen-lockfile",
      "RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod",
    ],
    [
      "bun",
      "bun.lock",
      "RUN npm install -g bun && bun install --frozen-lockfile",
      "RUN npm install -g bun && bun install --frozen-lockfile --production",
    ],
  ] as const)(
    "renders only %s dependency layers",
    (manager, lockfile, builderCommand, runtimeCommand) => {
      const dockerfile = renderDockerfile(manager);
      const [builder, runtime] = dockerfile.split("# Production stage");
      expect(builder.split("\n")).toContain(builderCommand);
      expect(runtime.split("\n")).toContain(runtimeCommand);
      for (const candidate of ["yarn.lock", "pnpm-lock.yaml", "bun.lock"]) {
        if (candidate === lockfile) {
          expect(builder).toContain(`COPY ${candidate}* ./`);
          expect(runtime).toContain(`COPY ${candidate}* ./`);
        } else {
          expect(dockerfile).not.toContain(candidate);
        }
      }
    },
  );

  it("keeps the package.json copy in both stages", () => {
    const dockerfile = renderDockerfile("npm");
    expect(dockerfile.match(/COPY package\*\.json \.\//g)?.length).toBe(2);
  });
});
