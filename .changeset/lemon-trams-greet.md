---
"@voltagent/core": patch
"@voltagent/cli": patch
---

feat: offline-first local prompts with version + label selection

### What's New

- Local prompt resolution now supports multiple versions and labels stored as
  `.voltagent/prompts/<promptName>/<version>.md`.
- Local files are used first; VoltOps is only queried if the local prompt is missing.
- If a local prompt is behind the online version, the agent logs a warning and records metadata.
- CLI `pull` can target labels or versions; `push` compares local vs online and creates new versions.

### CLI Usage

```bash
# Pull latest prompts (default)
volt prompts pull

# Pull a specific label or version (stored under .voltagent/prompts/<name>/<version>.md)
volt prompts pull --names support-agent --label production
volt prompts pull --names support-agent --prompt-version 4

# Push local changes (creates new versions after diff/confirm)
volt prompts push
```

### Agent Usage

```typescript
instructions: async ({ prompts }) => {
  return await prompts.getPrompt({
    promptName: "support-agent",
    version: 4,
  });
};
```

```typescript
instructions: async ({ prompts }) => {
  return await prompts.getPrompt({
    promptName: "support-agent",
    label: "production",
  });
};
```

### Offline-First Workflow

- Pull once, then run fully offline with local Markdown files.
- Point the runtime to your local directory:

```bash
export VOLTAGENT_PROMPTS_PATH="./.voltagent/prompts"
```
