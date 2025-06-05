---
title: Metadata
---

import MetadataUsageExplorer from '@site/src/components/metadata/MetadataUsageExplorer';

Metadata in VoltOps tracing consists of key-value pairs that provide rich context and organization for your AI workflows. Unlike the core functional data (inputs, outputs, errors), metadata helps you organize and understand the business context, operational environment, and relationships within your AI system.

By adding structured metadata to your traces, you can categorize, filter, and analyze your AI applications with precision, making debugging and optimization significantly more effective.

<MetadataUsageExplorer />

## Core Metadata Fields

| Field            | Category                  | Description                                                                  |
| ---------------- | ------------------------- | ---------------------------------------------------------------------------- |
| `agentId`        | Agent Identification      | Unique identifier for the AI agent or workflow                               |
| `instructions`   | Agent Identification      | Human-readable description of the agent's purpose                            |
| `version`        | Agent Identification      | Agent or model version for tracking changes over time                        |
| `userId`         | User & Session Context    | Identifies the user making the request for user behavior analysis            |
| `conversationId` | User & Session Context    | Groups related interactions in multi-turn conversations                      |
| `sessionId`      | User & Session Context    | Tracks user sessions across multiple conversations                           |
| `tags`           | Organizational Context    | Flexible labels for categorization (e.g., "support", "urgent", "production") |
| `department`     | Organizational Context    | Business unit or team responsible for the workflow                           |
| `projectId`      | Organizational Context    | Associates traces with specific projects or initiatives                      |
| `environment`    | Organizational Context    | Deployment environment (dev, staging, production)                            |
| `parentAgentId`  | Multi-Agent Relationships | Establishes hierarchical relationships between agents                        |
| `workflowId`     | Multi-Agent Relationships | Groups agents working together in complex workflows                          |
| `stage`          | Multi-Agent Relationships | Identifies the current stage in multi-step processes                         |

## Metadata Benefits

### Powerful Filtering and Search

Metadata enables sophisticated filtering across your traces:

- Find all traces from a specific user or conversation
- Filter by agent type, department, or priority level
- Locate workflows in specific environments or projects
- Search by custom business categories

### Performance Analysis

Organize performance data by meaningful business dimensions:

- Compare agent performance across different user segments
- Analyze costs by department or project
- Track improvements across agent versions
- Monitor environment-specific metrics

### Debugging and Troubleshooting

Metadata provides essential context for debugging:

- Quickly identify the business context of failed traces
- Correlate issues with specific user patterns or environments
- Track problems across related agents in complex workflows
- Understand the impact of issues on different user segments

### Compliance and Auditing

Structured metadata supports governance requirements:

- Maintain audit trails with business context
- Track data processing by user consent levels
- Associate AI decisions with responsible teams
- Monitor compliance across different regulatory environments
