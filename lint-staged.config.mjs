import { lstatSync } from "node:fs";
import path from "node:path";

/**
 * Files we never want lint-staged to format or lint.
 *
 * - `AGENTS.md` is the canonical coding-agent instruction file. It's
 *   hand-curated for agents and we don't want mechanical reformatting churn.
 * - `CLAUDE.md` (and any other aliases registered in
 *   `scripts/sync-agent-instructions.mjs`) are symlinks to AGENTS.md.
 *   Prettier 3.x errors when handed a symlink path explicitly, which breaks
 *   the pre-commit hook even though the underlying content is fine.
 */
const ignoredFilenames = new Set(["AGENTS.md", "CLAUDE.md"]);

const isIgnored = (file) => ignoredFilenames.has(path.basename(file));

/** Defensive guard for any other symlink that slips through `*.{md,mdx}`. */
const isSymlink = (file) => {
  try {
    return lstatSync(file).isSymbolicLink();
  } catch {
    return false;
  }
};

const quote = (file) => JSON.stringify(file);

export default {
  "*.{js,jsx,ts,tsx}": ["biome check --write --no-errors-on-unmatched"],
  "*.{md,mdx}": (files) => {
    const filtered = files.filter((f) => !isIgnored(f) && !isSymlink(f));
    if (filtered.length === 0) return [];
    return [`prettier --config ./.prettierrc --write ${filtered.map(quote).join(" ")}`];
  },
};
