import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "tsup";

// Copy docs functionality
const skipDirs = new Set(["node_modules", ".git", ".next", "dist", "build", ".turbo", ".vercel"]);
const skipFiles = new Set([".DS_Store", "Thumbs.db", ".env"]);

function shouldSkip(itemName: string, isDirectory: boolean) {
  if (isDirectory && skipDirs.has(itemName)) {
    return true;
  }
  if (!isDirectory && skipFiles.has(itemName)) {
    return true;
  }
  return false;
}

function copyRecursively(src: string, dest: string) {
  if (!fs.existsSync(src)) {
    console.warn(`Source path does not exist: ${src}`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const items = fs.readdirSync(src, { withFileTypes: true });

  for (const item of items) {
    if (shouldSkip(item.name, item.isDirectory())) {
      continue;
    }

    const srcPath = path.join(src, item.name);
    const destPath = path.join(dest, item.name);

    if (item.isDirectory()) {
      copyRecursively(srcPath, destPath);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (error) {
        console.warn(`Failed to copy ${srcPath}: ${(error as Error).message}`);
      }
    }
  }
}

function cleanDirectory(dir: string) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function copyDocs() {
  console.log("📚 Copying VoltAgent documentation and examples...");

  const packageRoot = process.cwd();
  const sourceDocsPath = path.join(packageRoot, "../../website/docs");
  const sourceExamplesPath = path.join(packageRoot, "../../examples");
  const sourcePackagesPath = path.join(packageRoot, "../../packages");
  const targetDocsPath = path.join(packageRoot, "docs");
  const targetExamplesPath = path.join(packageRoot, "examples");
  const targetPackagesPath = path.join(packageRoot, "packages");

  // Clean existing directories
  cleanDirectory(targetDocsPath);
  cleanDirectory(targetExamplesPath);
  cleanDirectory(targetPackagesPath);

  // Copy documentation
  if (fs.existsSync(sourceDocsPath)) {
    console.log("  📖 Copying documentation...");
    copyRecursively(sourceDocsPath, targetDocsPath);
    console.log(`  ✅ Documentation copied to ${targetDocsPath}`);
  } else {
    console.warn("  ⚠️  Documentation source not found, skipping...");
  }

  // Copy examples
  if (fs.existsSync(sourceExamplesPath)) {
    console.log("  🔧 Copying examples...");
    copyRecursively(sourceExamplesPath, targetExamplesPath);
    console.log(`  ✅ Examples copied to ${targetExamplesPath}`);
  } else {
    console.warn("  ⚠️  Examples source not found, skipping...");
  }

  // Copy changelog files from packages
  if (fs.existsSync(sourcePackagesPath)) {
    console.log("  📋 Copying package changelogs...");
    copyPackageChangelogs(sourcePackagesPath, targetPackagesPath);
    console.log(`  ✅ Changelogs copied to ${targetPackagesPath}`);
  } else {
    console.warn("  ⚠️  Packages source not found, skipping changelogs...");
  }

  console.log("✨ Copy process completed!");
}

function copyPackageChangelogs(sourcePkgPath: string, targetPkgPath: string) {
  if (!fs.existsSync(sourcePkgPath)) {
    return;
  }

  const packages = fs.readdirSync(sourcePkgPath, { withFileTypes: true });

  for (const pkg of packages) {
    if (pkg.isDirectory() && !shouldSkip(pkg.name, true)) {
      const sourceChangelogPath = path.join(sourcePkgPath, pkg.name, "CHANGELOG.md");

      if (fs.existsSync(sourceChangelogPath)) {
        const targetPkgDir = path.join(targetPkgPath, pkg.name);
        const targetChangelogPath = path.join(targetPkgDir, "CHANGELOG.md");

        // Create package directory if it doesn't exist
        if (!fs.existsSync(targetPkgDir)) {
          fs.mkdirSync(targetPkgDir, { recursive: true });
        }

        try {
          fs.copyFileSync(sourceChangelogPath, targetChangelogPath);
        } catch (error) {
          console.warn(`Failed to copy changelog for ${pkg.name}: ${(error as Error).message}`);
        }
      }
    }
  }
}

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: false,
  outDir: "dist",
  banner: {
    js: "#!/usr/bin/env node",
  },
  onSuccess: async () => {
    copyDocs();
  },
});
