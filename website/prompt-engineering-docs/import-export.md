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

## Export via REST API

Use project public and secret keys to export prompts without the dashboard.

Headers:

- `x-public-key`
- `x-secret-key`

Export all prompts (zip when multiple):

```bash
curl -X GET "$VOLTAGENT_API_URL/prompts/public/export/markdown" \
  -H "x-public-key: $VOLTAGENT_PUBLIC_KEY" \
  -H "x-secret-key: $VOLTAGENT_SECRET_KEY" \
  --output prompts.zip
```

Export selected prompts:

```bash
curl -X GET "$VOLTAGENT_API_URL/prompts/public/export/markdown?promptNames=support-agent,router" \
  -H "x-public-key: $VOLTAGENT_PUBLIC_KEY" \
  -H "x-secret-key: $VOLTAGENT_SECRET_KEY" \
  --output prompts.zip
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

## Read via REST API (JSON)

You can read prompts directly with JSON requests.

Read a prompt (public keys):

```bash
curl -X GET "$VOLTAGENT_API_URL/prompts/public/support-agent?label=production" \
  -H "x-public-key: $VOLTAGENT_PUBLIC_KEY" \
  -H "x-secret-key: $VOLTAGENT_SECRET_KEY"
```

## Create a New Version via REST API (JSON)

To update a prompt, create a new version using the public endpoint with project keys.

```bash
curl -X POST "$VOLTAGENT_API_URL/prompts/public/support-agent" \
  -H "x-public-key: $VOLTAGENT_PUBLIC_KEY" \
  -H "x-secret-key: $VOLTAGENT_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "content": { "text": "New system instructions" },
    "labels": ["production"],
    "tags": ["support"],
    "config": { "temperature": 0.3 },
    "commit_message": "Tighten response style"
  }'
```

If the prompt name already exists, this call creates a new version and updates labels
to point to the new version.

## Import via REST API

Import Markdown or zip files using the public API:

```bash
curl -X POST "$VOLTAGENT_API_URL/prompts/public/import/markdown" \
  -H "x-public-key: $VOLTAGENT_PUBLIC_KEY" \
  -H "x-secret-key: $VOLTAGENT_SECRET_KEY" \
  -F "file=@prompts.zip"
```

The response includes `success`, `imported`, `skipped`, and `errors`.

## CLI Pull/Push (Local Markdown)

Use the CLI to pull prompts to your local filesystem, and push changes back. Push will show
differences and ask for confirmation before creating new versions.

```bash
# Set credentials once (or use a .env file)
export VOLTAGENT_API_URL="https://api.voltagent.dev"
export VOLTAGENT_PUBLIC_KEY="pk_..."
export VOLTAGENT_SECRET_KEY="sk_..."

# Pull all prompts (writes to .voltagent/prompts)
volt prompts pull

# Pull selected prompts
volt prompts pull --names support-agent router

# Pull a specific label (requires --names)
volt prompts pull --names support-agent --label production

# Pull a specific version (requires --names)
volt prompts pull --names support-agent --prompt-version 4

# These pulls are stored as .voltagent/prompts/<promptName>/<version>.md

# Custom output directory and clean existing files first
volt prompts pull --out ./.prompts --clean

# Push local changes (creates new versions)
volt prompts push

# Push selected prompts only
volt prompts push --names support-agent router
```

If you pull to a custom directory, set `VOLTAGENT_PROMPTS_PATH` so agents can read from it.
