import * as path from "node:path";
import { type Tree, addProjectConfiguration, formatFiles, generateFiles } from "@nx/devkit";
import type { PackageGeneratorSchema } from "./schema";

export async function packageGenerator(tree: Tree, options: PackageGeneratorSchema) {
  const projectRoot = `packages/${options.name}`;
  addProjectConfiguration(tree, options.name, {
    root: projectRoot,
    projectType: "library",
    sourceRoot: `${projectRoot}/src`,
    targets: {},
  });
  generateFiles(tree, path.join(__dirname, "files"), projectRoot, options);
  await formatFiles(tree);
}

export default packageGenerator;
