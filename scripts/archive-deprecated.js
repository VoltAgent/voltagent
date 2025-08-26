#!/usr/bin/env node

/**
 * Archive deprecated packages post-publish
 * This script moves deprecated provider packages to a separate archive directory or repository
 * to keep the main codebase clean for contributors while not affecting published packages.
 */

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const DEPRECATED_PACKAGES = [
  "@voltagent/anthropic-ai",
  "@voltagent/google-ai",
  "@voltagent/groq-ai",
  "@voltagent/vercel-ai",
  "@voltagent/xsai",
  "@voltagent/vercel-ui",
];

const ARCHIVE_DIR = path.join(process.cwd(), "archive", "deprecated-providers");

async function archiveDeprecatedPackages() {
  console.log("🗄️  Starting archive process for deprecated packages...\n");

  // Create archive directory if it doesn't exist
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    console.log(`✅ Created archive directory: ${ARCHIVE_DIR}\n`);
  }

  // Create README for archive directory
  const archiveReadme = `# Deprecated VoltAgent Providers

This directory contains deprecated provider packages that have been replaced by Vercel AI SDK providers.

## Deprecated Packages

- **@voltagent/anthropic-ai** → Use \`@ai-sdk/anthropic\` with \`@voltagent/vercel-ai\`
- **@voltagent/google-ai** → Use \`@ai-sdk/google\` with \`@voltagent/vercel-ai\`  
- **@voltagent/groq-ai** → Use \`@ai-sdk/groq\` with \`@voltagent/vercel-ai\`

## Migration Guides

- [Anthropic Migration](https://voltagent.dev/docs/providers/anthropic-ai/)
- [Google AI Migration](https://voltagent.dev/docs/providers/google-ai/)
- [Groq Migration](https://voltagent.dev/docs/providers/groq-ai/)

## Why Archived?

These packages have been archived to:
1. Keep the main codebase clean for contributors
2. Reduce maintenance burden
3. Focus on core VoltAgent features
4. Leverage Vercel AI SDK's well-maintained providers

## Note

These packages are still available on NPM for backward compatibility, but will not receive updates.
`;

  fs.writeFileSync(path.join(ARCHIVE_DIR, "README.md"), archiveReadme);
  console.log("✅ Created archive README\n");

  // Move each deprecated package
  for (const packageName of DEPRECATED_PACKAGES) {
    const packageDir = packageName.replace("@voltagent/", "");
    const sourcePath = path.join(process.cwd(), "packages", packageDir);
    const targetPath = path.join(ARCHIVE_DIR, packageDir);

    if (fs.existsSync(sourcePath)) {
      console.log(`📦 Archiving ${packageName}...`);

      // Copy package to archive
      execSync(`cp -r "${sourcePath}" "${targetPath}"`, { stdio: "pipe" });
      console.log("  ✅ Copied to archive");

      // Remove from main packages directory
      execSync(`rm -rf "${sourcePath}"`, { stdio: "pipe" });
      console.log("  ✅ Removed from packages/");

      console.log(`  ✅ ${packageName} archived successfully\n`);
    } else {
      console.log(`  ⚠️  ${packageName} not found in packages/, skipping...\n`);
    }
  }

  // Update pnpm-workspace.yaml to exclude archived packages
  updateWorkspaceConfig();

  // Update root package.json scripts if needed
  updateRootPackageJson();

  console.log("🎉 Archive process completed successfully!");
  console.log("\n📝 Next steps:");
  console.log("1. Review the changes");
  console.log("2. Commit the archive directory");
  console.log("3. Consider creating a separate repository for archived packages");
  console.log("4. Update CI/CD to skip archived packages\n");
}

function updateWorkspaceConfig() {
  const workspacePath = path.join(process.cwd(), "pnpm-workspace.yaml");

  if (fs.existsSync(workspacePath)) {
    let content = fs.readFileSync(workspacePath, "utf-8");

    // Add exclusion for archive directory
    if (!content.includes("!archive/")) {
      content = content.replace("packages:\n", 'packages:\n  - "!archive/**"\n');

      fs.writeFileSync(workspacePath, content);
      console.log("✅ Updated pnpm-workspace.yaml to exclude archive/\n");
    }
  }
}

function updateRootPackageJson() {
  const packageJsonPath = path.join(process.cwd(), "package.json");

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    // Remove any scripts that reference deprecated packages
    const scriptsToUpdate = Object.entries(packageJson.scripts || {}).filter(([, script]) => {
      return !DEPRECATED_PACKAGES.some((pkg) => script.includes(pkg.replace("@voltagent/", "")));
    });

    packageJson.scripts = Object.fromEntries(scriptsToUpdate);

    fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
    console.log("✅ Updated root package.json scripts\n");
  }
}

// Run the archive process
archiveDeprecatedPackages().catch((error) => {
  console.error("❌ Archive process failed:", error);
  process.exit(1);
});
