#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");

const targets = [
  {
    label: "core",
    root: path.join(repoRoot, "packages", "core", "docs"),
  },
];

const sources = [
  {
    label: "website/docs",
    src: path.join(repoRoot, "website", "docs"),
    dest: ".",
  },
  {
    label: "website/actions-triggers-docs",
    src: path.join(repoRoot, "website", "actions-triggers-docs"),
    dest: "actions-triggers-docs",
  },
  {
    label: "website/deployment-docs",
    src: path.join(repoRoot, "website", "deployment-docs"),
    dest: "deployment-docs",
  },
  {
    label: "website/evaluation-docs",
    src: path.join(repoRoot, "website", "evaluation-docs"),
    dest: "evaluation-docs",
  },
  {
    label: "website/models-docs",
    src: path.join(repoRoot, "website", "models-docs"),
    dest: "models-docs",
  },
  {
    label: "website/observability",
    src: path.join(repoRoot, "website", "observability"),
    dest: "observability-platform",
  },
  {
    label: "website/prompt-engineering-docs",
    src: path.join(repoRoot, "website", "prompt-engineering-docs"),
    dest: "prompt-engineering-docs",
  },
  {
    label: "website/recipes",
    src: path.join(repoRoot, "website", "recipes"),
    dest: "recipes",
  },
  {
    label: "website/examples",
    src: path.join(repoRoot, "website", "examples"),
    dest: "site-examples",
  },
  {
    label: "website/blog",
    src: path.join(repoRoot, "website", "blog"),
    dest: "blog",
  },
  {
    label: "repo/docs",
    src: path.join(repoRoot, "docs"),
    dest: "repo-docs",
  },
];

const copyDir = (source, destination) => {
  if (!fs.existsSync(source)) {
    console.warn(`Skipping missing source: ${source}`);
    return;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
};

const syncTarget = (target) => {
  if (fs.existsSync(target.root)) {
    fs.rmSync(target.root, { recursive: true, force: true });
  }

  fs.mkdirSync(target.root, { recursive: true });

  for (const entry of sources) {
    const destPath = path.join(target.root, entry.dest);
    copyDir(entry.src, destPath);
  }

  console.log(`Synced docs into ${target.label}: ${target.root}`);
};

for (const target of targets) {
  syncTarget(target);
}
