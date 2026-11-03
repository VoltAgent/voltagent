import { describe, expect, it } from "vitest";

import { renderDockerfile } from "./templates";

const TEMPLATE = [
  "FROM {{dockerBaseImage}} AS builder",
  "",
  "WORKDIR /app",
  "",
  "{{dockerCopyFiles}}",
  "",
  "RUN {{dockerInstall}}",
  "",
  "FROM {{dockerBaseImage}}",
  "",
  "{{dockerCopyFiles}}",
  "",
  "RUN {{dockerInstallProd}}",
].join("\n");

describe("renderDockerfile", () => {
  it("renders npm projects without copying yarn or pnpm lockfiles", () => {
    const dockerfile = renderDockerfile(TEMPLATE, "npm");

    expect(dockerfile).toContain("COPY package*.json ./");
    expect(dockerfile).not.toContain("yarn.lock");
    expect(dockerfile).not.toContain("pnpm-lock.yaml");
    expect(dockerfile).toContain("RUN npm ci\n");
    expect(dockerfile).toContain("RUN npm ci --omit=dev");
  });

  it("renders yarn projects with their own lockfile and install command", () => {
    const dockerfile = renderDockerfile(TEMPLATE, "yarn");

    expect(dockerfile).toContain("COPY yarn.lock ./");
    expect(dockerfile).not.toContain("pnpm-lock.yaml");
    expect(dockerfile).toContain("corepack enable && yarn install --frozen-lockfile\n");
  });

  it("renders pnpm projects with their own lockfile and install command", () => {
    const dockerfile = renderDockerfile(TEMPLATE, "pnpm");

    expect(dockerfile).toContain("COPY pnpm-lock.yaml ./");
    expect(dockerfile).not.toContain("yarn.lock");
    expect(dockerfile).toContain("corepack enable && pnpm install --frozen-lockfile\n");
  });

  it("renders bun projects on the official bun image", () => {
    const dockerfile = renderDockerfile(TEMPLATE, "bun");

    expect(dockerfile).toContain("FROM oven/bun:1-alpine AS builder");
    expect(dockerfile).toContain("COPY bun.lock* ./");
    expect(dockerfile).toContain("RUN bun install --frozen-lockfile\n");
    expect(dockerfile).not.toContain("npm ci");
  });

  it("fills both stages for every manager", () => {
    for (const packageManager of ["npm", "yarn", "pnpm", "bun"] as const) {
      const dockerfile = renderDockerfile(TEMPLATE, packageManager);
      expect(dockerfile).not.toContain("{{docker");
      expect(dockerfile.match(/COPY package\*?\.json/g)?.length).toBe(2);
    }
  });
});
