---
title: Metadata
---

import MetadataUsageExplorer from '@site/src/components/docs-widgets/MetadataUsageExplorer';

Metadata in VoltOps tracing consists of key-value pairs that provide rich context and organization for your AI workflows. Unlike the core functional data (inputs, outputs, errors), metadata helps you organize and understand the business context, operational environment, and relationships within your AI system.

By adding structured metadata to your traces, you can categorize, filter, and analyze your AI applications with precision, making debugging and optimization significantly more effective.

<MetadataUsageExplorer />

Technical metadata helps optimize model performance, track different configurations, and correlate AI behavior with specific parameter settings. Essential for prompt engineering and model tuning.

## Why Metadata Important

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
