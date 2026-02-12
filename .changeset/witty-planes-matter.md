---
"@voltagent/core": patch
---

feat: improve workspace skill compatibility for third-party `SKILL.md` files that do not declare file allowlists in frontmatter.

- Infer `references`, `scripts`, and `assets` allowlists from relative Markdown links in skill instructions when explicit frontmatter arrays are missing.
- This enables skills like `microsoft/playwright-cli` (installed via `npx skills add ...`) to read linked reference files through workspace skill tools without manual metadata rewrites.
