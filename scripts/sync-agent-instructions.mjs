#!/usr/bin/env node

/**
 * Sync coding-agent instruction aliases across the repository.
 *
 * This script walks the repo, finds canonical instruction files, and creates
 * sibling symlinks for tools that expect a different filename. `AGENTS.md`
 * remains the source of truth; configured aliases point to it.
 *
 * Usage:
 *
 * ```bash
 * ./scripts/sync-agent-instructions.mjs
 * ./scripts/sync-agent-instructions.mjs --yes
 * ```
 *
 * Without `--yes`, the script prints the symlinks it will create and asks for
 * confirmation. Existing valid symlinks are skipped. Existing files or
 * symlinks pointing somewhere else are reported as conflicts and left alone.
 *
 * @module sync-agent-instructions
 */

import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const shouldSkipPrompt = process.argv.includes("--yes");

/**
 * Configure instruction aliases here.
 *
 * `AGENTS.md` is always the canonical instruction file.
 *
 * Add a filename to this list if another coding agent needs a different
 * instruction filename but should share the same canonical AGENTS.md content.
 */
const instructionAliases = ["CLAUDE.md"];

const ignoredDirectories = new Set([
  ".git",
  ".claude",
  ".changeset",
  ".docusaurus",
  ".joggr",
  ".next",
  ".netlify",
  ".nx",
  ".serena",
  ".turbo",
  ".wrangler",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

const stats = {
  created: 0,
  skipped: 0,
  conflicts: 0,
};

const pendingLinks = [];
const conflictedLinks = [];

function getPathStats(pathToCheck) {
  try {
    return fs.lstatSync(pathToCheck);
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

function isExpectedAlias(linkPath, pathStats) {
  return pathStats.isSymbolicLink() && fs.readlinkSync(linkPath) === "AGENTS.md";
}

function describeExistingAlias(linkPath, pathStats) {
  if (pathStats.isSymbolicLink()) {
    return `symlink to ${fs.readlinkSync(linkPath)}`;
  }

  if (pathStats.isFile()) {
    return "regular file";
  }

  if (pathStats.isDirectory()) {
    return "directory";
  }

  return "non-file path";
}

function collectInstructionLinks(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  let hasCanonicalInstructions = false;

  for (const entry of entries) {
    if (entry.name === "AGENTS.md" && entry.isFile()) {
      hasCanonicalInstructions = true;
      break;
    }
  }

  if (hasCanonicalInstructions) {
    const sourcePath = path.join(directory, "AGENTS.md");

    for (const instructionAlias of instructionAliases) {
      const linkPath = path.join(directory, instructionAlias);
      const linkPathStats = getPathStats(linkPath);

      if (linkPathStats === undefined) {
        pendingLinks.push({
          linkPath,
          sourcePath,
        });
      } else if (isExpectedAlias(linkPath, linkPathStats)) {
        stats.skipped += 1;
      } else {
        stats.conflicts += 1;
        conflictedLinks.push({
          description: describeExistingAlias(linkPath, linkPathStats),
          linkPath,
        });
      }
    }
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || ignoredDirectories.has(entry.name)) {
      continue;
    }

    collectInstructionLinks(path.join(directory, entry.name));
  }
}

function printConflictedLinks() {
  console.log("Instruction aliases skipped because the path already exists:");
  console.log("");

  for (const conflictedLink of conflictedLinks) {
    console.log(
      `- ${path.relative(repoRoot, conflictedLink.linkPath)}: expected symlink to AGENTS.md, found ${conflictedLink.description}`
    );
  }

  console.log("");
}

function printPendingLinks() {
  console.log("Instruction symlinks to create:");
  console.log("");

  const linksBySource = new Map();

  for (const pendingLink of pendingLinks) {
    const relativeSourcePath = path.relative(repoRoot, pendingLink.sourcePath);

    if (!linksBySource.has(relativeSourcePath)) {
      linksBySource.set(relativeSourcePath, []);
    }

    linksBySource.get(relativeSourcePath).push(path.relative(repoRoot, pendingLink.linkPath));
  }

  for (const [sourcePath, linkPaths] of linksBySource) {
    console.log(sourcePath);

    for (let index = 0; index < linkPaths.length; index += 1) {
      const prefix = index === linkPaths.length - 1 ? "└──" : "├──";
      console.log(`${prefix} ${linkPaths[index]}`);
    }

    console.log("");
  }
}

async function confirmPendingLinks() {
  if (shouldSkipPrompt) {
    return true;
  }

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await readline.question("Create these symlinks? [y/N] ");
    return answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes";
  } finally {
    readline.close();
  }
}

function createInstructionSymlink(pendingLink) {
  try {
    fs.symlinkSync("AGENTS.md", pendingLink.linkPath, "file");
  } catch (error) {
    const relativeLinkPath = path.relative(repoRoot, pendingLink.linkPath);

    if (process.platform === "win32" && error.code === "EPERM") {
      console.error(
        `Failed to create ${relativeLinkPath}. Windows may require Developer Mode or an elevated shell for symlinks.`
      );
    } else {
      console.error(`Failed to create ${relativeLinkPath}: ${error.message}`);
    }

    throw error;
  }
}

function createPendingLinks() {
  for (const pendingLink of pendingLinks) {
    createInstructionSymlink(pendingLink);
    stats.created += 1;
    console.log(`Created ${path.relative(repoRoot, pendingLink.linkPath)} -> AGENTS.md`);
  }
}

collectInstructionLinks(repoRoot);

if (conflictedLinks.length > 0) {
  printConflictedLinks();
}

if (pendingLinks.length > 0) {
  printPendingLinks();

  if (await confirmPendingLinks()) {
    createPendingLinks();
  } else {
    console.log("No symlinks created.");
  }
}

console.log(
  `Instruction symlink sync complete: ${stats.created} created, ${stats.skipped} skipped, ${stats.conflicts} conflicts.`
);
