# VoltAgent Website

Docusaurus 3 docs + marketing site. Deployed independently from the published packages.

## Critical Rules

- **Uses npm, not pnpm.** This directory is **not** in `pnpm-workspace.yaml`. Install with `npm install` from `website/`. Don't `pnpm install` here — there's no `pnpm-lock.yaml` and you'll desync deps.
- **Plugin `index.js` files are generated.** `npm run build:plugins` runs sucrase on `plugins/**/*.ts` → `plugins/**/*.js` in place. Edit the `.ts`, re-run the script. Don't hand-edit the `.js`.
- **Markdown/MDX uses Prettier with the root config.** `lint-staged` runs `prettier --config ../.prettierrc --write` on `*.md` / `*.mdx`. JS/TS uses the local Biome (`biome check .`) — separate from the root Biome run.
- **Docusaurus version is pinned at `3.1.1`.** New plugins/themes must be `3.1.1`-compatible. A version bump is its own task.
- **`static/llms.txt` is hand-curated, not generated.** Verified: no build script, plugin, or hook produces it. Edit by hand and commit. ~38KB. Keep in sync with major doc additions or restructures — it's referenced from agent instructions across the repo.
- **Multiple docs trees, multiple sidebars.** Each top-level docs dir (`docs/`, `evaluation-docs/`, `models-docs/`, `observability/`, `actions-triggers-docs/`, `deployment-docs/`, `prompt-engineering-docs/`, `recipes/`) has its own `sidebars*.ts`. Adding a doc page means updating both the file and the matching sidebar.
- **Docusaurus SSRs.** Don't import Node-only modules (`fs`, `path`, `child_process`) at the top of client components — works in `npm run start` (Node-side), fails in `npm run build`. Wrap Node-only access in `useEffect` or `<BrowserOnly>`.

## Setup

```bash
cd website
npm install
npm run start                     # dev server on :3000
npm run start -- --port 3001      # different port if 3000 is busy
npm run start -- --host 0.0.0.0   # expose to LAN
```

## Validation

```bash
npm run typecheck
npm run lint                      # Biome (website-local config)
npm run lint:fix
npm run build                     # full Docusaurus build — slow but the only real validation
```

## Boundaries

**Allowed without asking**

- Adding or editing docs, blog posts, recipes.
- Editing `sidebars*.ts`.
- Internal React components in `src/`.
- Tailwind class tweaks inside components.
- Adding static assets to `static/img/` (favicons, screenshots).

**Ask first**

- Docusaurus version bumps.
- New plugins or themes.
- Restructuring docs trees or renaming top-level dirs.
- Changing `static/llms.txt` structure (content additions are fine).
- Editing `docusaurus.config.ts`, `tailwind.config.js`, `tsconfig.json`, `babel.config.js`, local `biome.json`, or `lint-staged` config.
- Adding redirects via `@docusaurus/plugin-client-redirects`.
- Bumping any dependency in `package.json`.

**Never without explicit ask**

- Hand-editing transpiled `plugins/*/index.js`.
- Deleting docs without setting up a redirect (`@docusaurus/plugin-client-redirects` is wired up).
- Changing the deployment pipeline (GitHub Actions, deploy keys, hosting config).
- Committing `build/`, `.docusaurus/`, or `node_modules/`.

## Related

- Parent: [`../AGENTS.md`](../AGENTS.md)
- Sibling: `../examples/` (which **is** in the pnpm workspace, unlike this directory)
- Repo agent docs: [`../contributing/coding-agents.md`](../contributing/coding-agents.md)
