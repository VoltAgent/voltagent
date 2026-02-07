---
title: Workspace Skills
slug: /workspaces/skills
---

# Workspace Skills

> **Note: Workspace Skills are Experimental**
> The Skills API is experimental and may change as the ecosystem evolves.

Workspace skills are reusable instructions stored as `SKILL.md` files. They can be discovered, searched, activated, and injected into the agent prompt.

## Skill layout

Skills live under a root path (default: `/skills`) and each skill is a folder with a `SKILL.md`.

```
/skills
  /data-analysis
    SKILL.md
    references/
      schema.md
    scripts/
      analyze.py
    assets/
      sample.csv
```

You can also provide an async root resolver if skill paths are dynamic:

```ts
const workspace = new Workspace({
  skills: {
    rootPaths: async ({ workspace }) => ["/skills", `/skills/${workspace.id}`],
  },
});
```

## SKILL.md format

`SKILL.md` uses YAML frontmatter plus Markdown instructions:

```md
---
name: Data Analysis
description: Analyze CSV data with pandas and chart results.
version: "1.0.0"
tags:
  - data
  - python
references:
  - references/schema.md
scripts:
  - scripts/analyze.py
assets:
  - assets/sample.csv
---

When analyzing data:

1. Load CSV files with pandas.
2. Summarize key statistics.
3. Produce a chart and explain it.
```

Only files listed under `references`, `scripts`, or `assets` are readable via the skill file tools.

## Activating skills and prompt injection

Activate a skill, then inject activated skills into the system prompt:

```ts
import { Agent, Workspace } from "@voltagent/core";

const workspace = new Workspace({
  skills: {
    rootPaths: ["/skills"],
  },
});

const skillsHook = workspace.createSkillsPromptHook({
  includeAvailable: true,
  includeActivated: true,
});

const agent = new Agent({
  name: "skills-agent",
  model,
  instructions: "Use workspace skills when relevant.",
  workspace,
  hooks: skillsHook,
  workspaceToolkits: { skills: {} },
});
```

The injected prompt is wrapped in `<workspace_skills>` tags and can include both available and activated skills.

## Skill tools

The toolkit provides:

- `workspace_list_skills`: list available skills
- `workspace_search_skills`: search skills (BM25/vector/hybrid)
- `workspace_read_skill`: read the full SKILL.md instructions
- `workspace_activate_skill`: activate a skill
- `workspace_deactivate_skill`: deactivate a skill
- `workspace_read_skill_reference`: read reference files
- `workspace_read_skill_script`: read scripts
- `workspace_read_skill_asset`: read assets

## Search notes

Skill search indexes the skill name, description, and instructions. Vector search requires an embedding model and vector adapter.
