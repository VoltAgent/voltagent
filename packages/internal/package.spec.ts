import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PackageJson } from "type-fest";
import { beforeAll, describe, expect, it } from "vitest";

// TODO: once we move to ESM, we can use this
// const __dirname = path.dirname(new URL(import.meta.url).pathname);

describe("package.json", async () => {
  let packageJson: PackageJson;

  beforeAll(async () => {
    packageJson = await readPackageJson();
  });

  it('should never include "@voltagent/* deps in dependencies to prevent circular deps', () => {
    const packages = Object.keys(packageJson.dependencies ?? {});

    for (const pkg of packages) {
      expect(pkg).not.toMatch(/@voltagent\//);
    }
  });

  it('should never include "@voltagent/* deps in devDependencies to prevent circular deps', () => {
    const packages = Object.keys(packageJson.devDependencies ?? {});

    for (const pkg of packages) {
      expect(pkg).not.toMatch(/@voltagent\//);
    }
  });
});

async function readPackageJson() {
  const packageJson = JSON.parse(await readFile(path.join(__dirname, "package.json"), "utf-8"));
  return packageJson;
}
