---
title: Sessions
---

import SessionExplorer from '@site/src/components/docs-widgets/SessionExplorer';

# Sessions

Complex AI workflows often require multiple trace executions to complete a user's request. VoltOps sessions automatically organize related traces into unified conversations, providing complete visibility into multi-step interactions. Simply include a `conversationId` when creating traces to enable session grouping.

## Creating Sessions

Include a `conversationId` parameter when creating traces. Use any string identifier that represents your conversation or workflow. VoltOps will automatically group all traces sharing the same `conversationId` into a session.

<SessionExplorer />

![Trace creation in dashboard](https://cdn.voltagent.dev/docs/sdk-doc-demo-screenshots/trace-start.png)

## Session Replay

VoltOps dashboard automatically groups traces by `conversationId`, enabling you to:

- Follow complete conversation threads
- Troubleshoot with full interaction context
- Monitor performance across entire user journeys
- Measure success rates for complete workflows

Sessions provide holistic views of user interactions by connecting related traces into coherent workflows.
