---
title: Overview
slug: /
---

# Prompt Management

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/docs/voltop-docs/prompt-management.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

VoltOps Prompt Management provides a centralized system for creating, versioning, and deploying prompts across your AI agents. Store prompts in the cloud, manage multiple versions, promote to different environments, and track usage analytics.

## Core Concepts

### Prompts

A prompt is a reusable template that defines instructions for your AI agents. Each prompt has:

- **Name**: Unique identifier within a project (e.g., `customer-support-agent`)
- **Description**: Optional text explaining the prompt's purpose
- **Tags**: Organizational labels for filtering and categorization
- **Content**: The actual prompt text or chat messages
- **Type**: Either `text` (single prompt) or `chat` (multi-turn conversation template)

### Versions

Every change to a prompt creates a new version. Versions are immutable once created, enabling:

- **Version history**: Track all changes over time
- **Rollback capability**: Return to any previous version
- **A/B testing**: Compare different prompt variations
- **Audit trail**: See who made changes and when

Each version includes:

- Version number (auto-incremented)
- Content and configuration
- Labels for environment targeting
- Commit message describing changes
- Creator and timestamp

### Labels

Labels control which prompt version serves different environments. Predefined labels include:

| Label         | Purpose                             | Color |
| ------------- | ----------------------------------- | ----- |
| `production`  | Live production traffic             | Green |
| `staging`     | Pre-production testing              | Amber |
| `development` | Active development                  | Cyan  |
| `testing`     | QA and test environments            | Rose  |
| `latest`      | Most recent version (auto-assigned) | Gray  |

You can also create custom labels for specific use cases (e.g., `beta`, `canary`, `region-eu`).

## Next Steps

- [Creating Prompts](./creating-prompts) - Create and configure prompts
- [Import & Export](./import-export) - Backup and share prompts
- [Analytics](./analytics) - Track usage and performance
- [Usage](./usage) - Integrate prompts into your agents

## Best Practices

### Naming Conventions

Use descriptive, lowercase names with hyphens:

- `customer-support-agent`
- `order-confirmation-email`
- `product-recommendation-v2`

### Version Commit Messages

Write clear commit messages describing changes:

- "Added multilingual support for Spanish"
- "Reduced response length for mobile"
- "Fixed tone for enterprise customers"

### Label Strategy

- Keep `production` for battle-tested prompts
- Use `staging` for pre-release validation
- Test changes in `development` first
- Create custom labels for A/B tests (e.g., `variant-a`, `variant-b`)

### Variable Naming

Use clear, descriptive variable names:

- `{{userName}}` instead of `{{u}}`
- `{{companyName}}` instead of `{{c}}`
- `{{subscriptionTier}}` instead of `{{tier}}`

## Free Plan Limits

The free plan includes:

- **1 prompt** per project
- Unlimited versions per prompt
- Full version history and analytics

Upgrade to Core for unlimited prompts.
