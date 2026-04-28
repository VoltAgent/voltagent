---
title: Public Trace API
description: Query VoltOps traces with project API keys for workflow testers, internal dashboards, and debugging tools.
---

# Public Trace API

VoltOps exposes a project-key authenticated trace search endpoint for applications that need to load previous runs outside the VoltOps dashboard.

This API is available on the Pro plan and above.

Use this API when you are building:

- workflow testers that preload earlier workflow runs
- internal debugging tools for product or support teams
- prompt iteration UIs that compare a new run against previous traces
- environment-aware replay tools, for example loading a production run into a staging tester

The endpoint returns persisted VoltOps traces for one project with pagination, sorting, and the same core filters used by the tracing UI.

## Availability

Public trace search is available on VoltOps Pro and higher plans. Projects on plans without this feature receive an authorization or plan-limit response from the VoltOps API.

## Endpoint

```http
GET https://api.voltagent.dev/api/public/otel/v1/traces
```

Authenticate with project keys:

```http
x-public-key: pk_xxxx
x-secret-key: sk_live_xxxx
```

The API keys determine the project scope. If a client sends a `projectId` query parameter, VoltOps ignores it and uses the project attached to the keys.

:::caution
The secret key is sensitive. Call this endpoint from your backend, a server action, or another trusted runtime. Do not expose `x-secret-key` in browser code.
:::

## Use from `@voltagent/core`

```ts
import { VoltOpsClient } from "@voltagent/core";

const voltops = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
});

const traces = await voltops.observability.traces.list({
  search: "checkout",
  environments: ["dev", "prod"],
  status: ["success", "error"],
  limit: 20,
  offset: 0,
  sortBy: "start_time",
  sortOrder: "desc",
});

console.log(traces.data);
```

The same client works for packages and applications built on top of `@voltagent/core`, including a workflow tester service that already has access to your VoltOps project keys.

## Use from `@voltagent/sdk`

If your integration uses the REST SDK:

```ts
import { VoltAgentCoreAPI } from "@voltagent/sdk";

const api = new VoltAgentCoreAPI({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
});

const traces = await api.observability.traces.list({
  conversationId: "conv_123",
  limit: 10,
});
```

`@voltagent/sdk` also exports `VoltOpsClient`, which extends the core client and supports the same `voltops.observability.traces.list()` call.

## Use with `fetch`

```ts
const params = new URLSearchParams({
  search: "invoice workflow",
  environments: "production",
  limit: "25",
  offset: "0",
  sortBy: "start_time",
  sortOrder: "desc",
});

const response = await fetch(`https://api.voltagent.dev/api/public/otel/v1/traces?${params}`, {
  headers: {
    "x-public-key": process.env.VOLTAGENT_PUBLIC_KEY!,
    "x-secret-key": process.env.VOLTAGENT_SECRET_KEY!,
  },
});

if (!response.ok) {
  throw new Error(`Trace search failed: ${response.status}`);
}

const traces = await response.json();
```

## Query Options

All query parameters are optional. Values that accept multiple entries can be sent as comma-separated strings, or as arrays when using the SDK helpers.

| Parameter            | Type               | Description                                           |
| -------------------- | ------------------ | ----------------------------------------------------- |
| `limit`              | number             | Page size. Defaults to the API default.               |
| `offset`             | number             | Number of traces to skip.                             |
| `sortBy`             | string             | Sort field, commonly `start_time`.                    |
| `sortOrder`          | `asc` or `desc`    | Sort direction.                                       |
| `search`             | string             | Text search across trace fields.                      |
| `traceId`            | string             | Match a specific trace ID.                            |
| `agentId`            | string or string[] | Filter by agent or workflow entity ID.                |
| `entityType`         | string or string[] | Filter by entity type, such as `agent` or `workflow`. |
| `conversationId`     | string             | Filter traces from one conversation/session.          |
| `userId`             | string             | Filter traces for one user.                           |
| `model`              | string or string[] | Filter by model name.                                 |
| `status`             | string or string[] | Filter by trace status.                               |
| `level`              | string or string[] | Filter by trace level.                                |
| `tags`               | string or string[] | Filter by trace tags.                                 |
| `environments`       | string or string[] | Filter by `environment` resource attribute.           |
| `startDate`          | string or Date     | Include traces starting after this time.              |
| `endDate`            | string or Date     | Include traces starting before this time.             |
| `minTokens`          | number             | Minimum token count.                                  |
| `maxTokens`          | number             | Maximum token count.                                  |
| `minCost`            | number             | Minimum cost.                                         |
| `maxCost`            | number             | Maximum cost.                                         |
| `minDuration`        | number             | Minimum duration in milliseconds.                     |
| `maxDuration`        | number             | Maximum duration in milliseconds.                     |
| `promptId`           | string             | Filter by prompt ID.                                  |
| `promptVersion`      | string             | Filter by prompt version.                             |
| `feedbackKey`        | string or string[] | Filter by feedback key.                               |
| `feedbackScore`      | number             | Match an exact feedback score.                        |
| `minFeedbackScore`   | number             | Minimum feedback score.                               |
| `maxFeedbackScore`   | number             | Maximum feedback score.                               |
| `feedbackValue`      | string             | Filter by feedback value.                             |
| `feedbackSourceType` | string or string[] | Filter by feedback source type.                       |

## Response Shape

```ts
type TraceListResponse = {
  data: Array<{
    trace_id: string;
    project_id: string;
    agent_id?: string;
    entity_type?: string;
    user_id?: string | null;
    conversation_id?: string | null;
    start_time: string;
    end_time?: string | null;
    status?: string | null;
    input?: unknown;
    output?: unknown;
    usage?: unknown;
    metadata?: Record<string, unknown> | null;
    tags?: string[] | null;
    model?: string | null;
    level?: string | null;
    status_message?: string | null;
    service_name?: string;
    span_count?: number;
    error_count?: number;
    duration_ms?: number | null;
    resource_attributes?: Record<string, unknown> | null;
    latest_feedback_score?: number | null;
    latest_feedback_key?: string | null;
    latest_feedback_comment?: string | null;
    latest_feedback_at?: string | null;
  }>;
  total: number;
  pageCount: number;
};
```

Use `total`, `pageCount`, `limit`, and `offset` to build paginated trace pickers.

## Workflow Tester Pattern

A common workflow tester flow looks like this:

1. Search previous traces by workflow ID, environment, user, or free text.
2. Let the user select a trace.
3. Use the selected trace's `input`, `metadata`, `conversation_id`, or tags to prefill the tester.
4. Run the workflow with modified prompts or config.
5. Compare the new trace against the selected previous trace in VoltOps.

Example server-side loader:

```ts
import { VoltOpsClient } from "@voltagent/core";

const voltops = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
});

export async function loadWorkflowRuns(workflowId: string, environment: string) {
  return await voltops.observability.traces.list({
    entityType: "workflow",
    agentId: workflowId,
    environments: environment,
    limit: 50,
    sortBy: "start_time",
    sortOrder: "desc",
  });
}
```

For cross-environment testing, use the keys for the source environment/project when loading old runs, then run the tester with the target environment's configuration.

## Local Hono/Elysia Routes vs VoltOps API

The local server routes such as `/observability/traces` read from the local in-memory or configured observability storage attached to the running app. They are useful for local development and live debugging.

The VoltOps public trace API reads persisted traces from VoltOps. Use it when you need older runs, production runs, or traces from a different deployed environment.

## Security Notes

- Treat `VOLTAGENT_SECRET_KEY` as backend-only.
- Gate access in your own application to users who should be allowed to inspect persisted traces. VoltOps enforces the project plan on the API side.
- Scope each workflow tester deployment to the minimum project keys it needs.
- Prefer separate VoltOps projects for dev, staging, and production if users need clear environment boundaries.
- Log trace IDs, not full trace payloads, when debugging your tester.
