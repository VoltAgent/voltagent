---
title: Import & Export
---

# Import & Export

Backup, share, and version control your prompts with import and export functionality.

## Exporting Prompts

Export prompts as Markdown files for backup or version control:

1. Click **Export** on the prompt list page to export all prompts
2. Or click **Export Markdown** on a specific prompt's detail page

Exported files include frontmatter with metadata:

```markdown
---
name: customer-support-agent
description: Main support agent prompt
type: text
version: 5
labels:
  - production
  - latest
---

You are a helpful customer support agent...
```

## Importing Prompts

Import prompts from Markdown or CSV files:

1. Click **Import** on the prompts page
2. Select your file(s)
3. Preview the changes
4. Confirm the import

The import system detects:

- New prompts to create
- Existing prompts to update with new versions
- Potential conflicts or errors
