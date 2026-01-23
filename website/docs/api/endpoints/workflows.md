---
title: Workflow Endpoints
sidebar_label: Workflows
---

# Workflow API Endpoints

The Workflow API enables execution and management of multi-step workflows with suspend/resume capabilities. All workflow endpoints follow the pattern `/workflows/*`.

## List All Workflows

Returns a list of all registered workflows.

**Endpoint:** `GET /workflows`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "order-approval",
      "name": "Order Approval Workflow",
      "purpose": "Process and approve customer orders",
      "stepsCount": 5,
      "status": "idle"
    },
    {
      "id": "data-processing",
      "name": "Data Processing Pipeline",
      "purpose": "ETL pipeline for data transformation",
      "stepsCount": 8,
      "status": "idle"
    }
  ]
}
```

**cURL Example:**

```bash
curl http://localhost:3141/workflows
```

## Get Workflow Details

Retrieve detailed information about a specific workflow including schemas.

**Endpoint:** `GET /workflows/:id`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "order-approval",
    "name": "Order Approval Workflow",
    "purpose": "Process and approve customer orders",
    "status": "idle",
    "stepsCount": 5,
    "steps": [
      {
        "id": "validate-order",
        "name": "Validate Order",
        "type": "andThen",
        "purpose": "Validate order data",
        "inputSchema": {
          /* JSON Schema */
        },
        "outputSchema": {
          /* JSON Schema */
        }
      },
      {
        "id": "check-inventory",
        "name": "Check Inventory",
        "type": "andThen",
        "purpose": "Verify stock availability"
      },
      {
        "id": "approval-required",
        "name": "Manager Approval",
        "type": "andWhen",
        "purpose": "Wait for manager approval if needed",
        "suspendSchema": {
          /* JSON Schema */
        },
        "resumeSchema": {
          /* JSON Schema */
        }
      }
    ],
    "inputSchema": {
      "type": "object",
      "properties": {
        "orderId": { "type": "string" },
        "amount": { "type": "number" },
        "items": { "type": "array" }
      },
      "required": ["orderId", "amount"]
    },
    "suspendSchema": null,
    "resumeSchema": null
  }
}
```

**Note:** Schemas are converted from Zod to JSON Schema format using `zodSchemaToJsonUI`.

**cURL Example:**

```bash
curl http://localhost:3141/workflows/order-approval
```

## List Workflow Executions

Retrieve executions for a workflow using query parameters.

**Endpoint:** `GET /workflows/executions`

**Query Parameters:**

| Name         | Type              | Description                                                                  |
| ------------ | ----------------- | ---------------------------------------------------------------------------- |
| `workflowId` | string (optional) | Workflow ID to filter executions (omit to get all)                           |
| `status`     | string (optional) | Filter by status (`running`, `suspended`, `completed`, `cancelled`, `error`) |
| `from`       | string (optional) | ISO timestamp to filter executions created after this time                   |
| `to`         | string (optional) | ISO timestamp to filter executions created before this time                  |
| `limit`      | number (optional) | Max results to return                                                        |
| `offset`     | number (optional) | Offset for pagination                                                        |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "6a8ca92c-0d8a-425f-b24f-09f841a8c200",
      "workflowId": "order-approval",
      "workflowName": "Order Approval Workflow",
      "status": "completed",
      "input": {
        "employeeId": "sample-employeeId",
        "amount": 42,
        "category": "sample-category",
        "description": "sample-description"
      },
      "metadata": {
        "traceId": "abe55638e17097f497bfb7ba5ed92a50",
        "spanId": "0704efe9b0bf5bfc"
      },
      "events": [
        {
          "id": "3a290355-4baa-4e48-9502-f8d314fb008e",
          "type": "workflow-start",
          "name": "Expense Approval Workflow",
          "from": "Expense Approval Workflow",
          "startTime": "2025-12-10T15:18:04.423Z",
          "endTime": "2025-12-10T15:18:04.423Z",
          "status": "running",
          "input": {
            "employeeId": "sample-employeeId",
            "amount": 42,
            "category": "sample-category",
            "description": "sample-description"
          }
        },
        {
          "id": "8d80ee68-bd2d-451f-abed-856845280509",
          "type": "workflow-complete",
          "name": "Expense Approval Workflow",
          "from": "Expense Approval Workflow",
          "startTime": "2025-12-10T15:18:05.415Z",
          "endTime": "2025-12-10T15:18:05.415Z",
          "status": "success",
          "output": {
            "status": "approved",
            "approvedBy": "system",
            "finalAmount": 42
          }
        }
      ],
      "output": {
        "status": "approved",
        "approvedBy": "system",
        "finalAmount": 42
      },
      "createdAt": "2025-12-10T15:18:04.421Z",
      "updatedAt": "2025-12-10T15:18:05.413Z"
    }
  ]
}
```

**cURL Example:**

```bash
curl "http://localhost:3141/workflows/executions?workflowId=order-approval&status=completed&limit=20&offset=0"
```

**List all executions:**

```bash
curl "http://localhost:3141/workflows/executions?limit=50"
```

## Execute Workflow

Execute a workflow synchronously and wait for completion.

**Endpoint:** `POST /workflows/:id/execute`

**Request Body:**

```json
{
  "input": {
    "orderId": "ORD-12345",
    "amount": 5000,
    "customerEmail": "customer@example.com",
    "items": ["laptop", "mouse", "keyboard"]
  },
  "options": {
    "userId": "user-123",
    "conversationId": "conv-456",
    "executionId": "custom-exec-id",
    "context": {
      "priority": "high",
      "department": "sales"
    },
    "workflowState": {
      "plan": "pro",
      "region": "eu"
    }
  }
}
```

**Options:**
| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | User ID for tracking |
| `conversationId` | string | Conversation context |
| `executionId` | string | Custom execution ID |
| `context` | object | Additional context data |
| `workflowState` | object | Shared state available to workflow steps |

**Response (Completed):**

```json
{
  "success": true,
  "data": {
    "executionId": "exec_1234567890_abc123",
    "startAt": "2024-01-15T10:00:00.000Z",
    "endAt": "2024-01-15T10:00:05.123Z",
    "status": "completed",
    "result": {
      "approved": true,
      "processedBy": "system",
      "totalAmount": 5000
    }
  }
}
```

**Response (Suspended):**

```json
{
  "success": true,
  "data": {
    "executionId": "exec_1234567890_abc123",
    "startAt": "2024-01-15T10:00:00.000Z",
    "endAt": null,
    "status": "suspended",
    "result": null,
    "suspension": {
      "suspendedAt": "2024-01-15T10:00:02.500Z",
      "reason": "Waiting for manager approval",
      "suspendedStepIndex": 2
    }
  }
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3141/workflows/order-approval/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "orderId": "ORD-789",
      "amount": 1500,
      "items": ["book", "pen"]
    },
    "options": {
      "userId": "user-456"
    }
  }'
```

## Stream Workflow Execution

Execute a workflow and stream events via Server-Sent Events (SSE).

**Endpoint:** `POST /workflows/:id/stream`

**Request Body:** Same as `/execute` endpoint

**Response:** Server-Sent Events stream

**Event Types:**

- `workflow-start` - Workflow execution started
- `step-start` - Step execution started
- `step-complete` - Step completed successfully
- `workflow-suspended` - Workflow suspended
- `workflow-complete` - Workflow completed successfully
- `workflow-error` - Workflow encountered an error
- `workflow-result` - Final execution result

**Event Format:**

```
data: {"type":"step-start","executionId":"exec_123","from":"validate-order","timestamp":"2024-01-15T10:00:00Z"}

data: {"type":"step-complete","executionId":"exec_123","from":"validate-order","timestamp":"2024-01-15T10:00:01Z"}

data: {"type":"workflow-complete","executionId":"exec_123","timestamp":"2024-01-15T10:00:05Z"}
```

**cURL Example:**

```bash
curl -N -X POST http://localhost:3141/workflows/order-approval/stream \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "orderId": "ORD-999",
      "amount": 3000
    }
  }'
```

**JavaScript Example:**

```javascript
const response = await fetch("http://localhost:3141/workflows/order-approval/stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    input: { orderId: "ORD-123", amount: 2000 },
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split("\n");

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const event = JSON.parse(line.slice(6));
      console.log(`[${event.type}]`, event);

      if (event.type === "workflow-suspended") {
        console.log("Workflow suspended, need to resume");
      }
    }
  }
}
```

## Suspend Workflow

Suspend a running workflow execution.

**Endpoint:** `POST /workflows/:id/executions/:executionId/suspend`

**Request Body:**

```json
{
  "reason": "Manual suspension for review"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "executionId": "exec_1234567890_abc123",
    "status": "suspended",
    "suspension": {
      "suspendedAt": "2024-01-15T10:30:45.123Z",
      "reason": "Manual suspension for review"
    }
  }
}
```

**Error Cases:**

- `404` - Execution not found
- `400` - Workflow not in suspendable state (already completed/suspended)

**cURL Example:**

```bash
curl -X POST http://localhost:3141/workflows/data-processing/executions/exec_123/suspend \
  -H "Content-Type: application/json" \
  -d '{"reason": "System maintenance"}'
```

## Resume Workflow

Resume a suspended workflow execution.

**Endpoint:** `POST /workflows/:id/executions/:executionId/resume`

**Request Body:**

```json
{
  "resumeData": {
    "approved": true,
    "approvedBy": "manager@company.com",
    "comments": "Approved for VIP customer"
  },
  "options": {
    "stepId": "approval-step"
  }
}
```

**Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| `resumeData` | any | Data to pass to the resumed step |
| `options.stepId` | string | Specific step to resume from |

**Response:**

```json
{
  "success": true,
  "data": {
    "executionId": "exec_1234567890_abc123",
    "startAt": "2024-01-15T10:00:00.000Z",
    "endAt": "2024-01-15T10:35:20.456Z",
    "status": "completed",
    "result": {
      "approved": true,
      "finalAmount": 4500,
      "processedSteps": 5
    }
  }
}
```

**Error Cases:**

- `404` - Execution not found or not suspended
- `400` - Invalid resume data (schema validation failed)

**cURL Example:**

```bash
curl -X POST http://localhost:3141/workflows/order-approval/executions/exec_123/resume \
  -H "Content-Type: application/json" \
  -d '{
    "resumeData": {
      "approved": true,
      "managerId": "mgr-456"
    }
  }'
```

## Get Workflow State

Retrieve the current state of a workflow execution.

**Endpoint:** `GET /workflows/:id/executions/:executionId/state`

**Response:**

```json
{
  "success": true,
  "data": {
    "executionId": "exec_1234567890_abc123",
    "workflowId": "order-approval",
    "status": "suspended",
    "startAt": "2024-01-15T10:00:00.000Z",
    "suspension": {
      "suspendedAt": "2024-01-15T10:00:02.500Z",
      "reason": "Awaiting approval",
      "stepIndex": 2,
      "stepId": "approval-required"
    },
    "input": {
      "orderId": "ORD-123",
      "amount": 5000
    },
    "context": {
      "userId": "user-123",
      "priority": "high"
    }
  }
}
```

**cURL Example:**

```bash
curl http://localhost:3141/workflows/order-approval/executions/exec_123/state
```

## Workflow Status Values

Workflows can have the following status values:

| Status      | Description                           |
| ----------- | ------------------------------------- |
| `idle`      | Workflow registered but not executing |
| `running`   | Workflow actively executing           |
| `suspended` | Workflow paused awaiting resume       |
| `completed` | Workflow finished successfully        |
| `error`     | Workflow terminated with error        |

## Step Types

Workflows support various step types:

| Type          | Description                       |
| ------------- | --------------------------------- |
| `andThen`     | Sequential execution              |
| `andWhen`     | Conditional execution             |
| `andAll`      | Parallel execution of all         |
| `andRace`     | First to complete wins            |
| `andTap`      | Side effect without changing flow |
| `andAgent`    | Execute an agent                  |
| `andWorkflow` | Execute a sub-workflow            |

## Error Handling

**404 - Workflow Not Found:**

```json
{
  "success": false,
  "error": "Workflow order-approval not found"
}
```

**400 - Invalid Input:**

```json
{
  "success": false,
  "error": "Input validation failed: missing required field 'orderId'"
}
```

**500 - Server Error:**

```json
{
  "success": false,
  "error": "Failed to execute workflow"
}
```

## Complete Example

Here's a complete workflow execution lifecycle:

```javascript
// 1. Start workflow
const executeResponse = await fetch("/workflows/order-approval/execute", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    input: {
      orderId: "ORD-999",
      amount: 10000,
      items: ["laptop", "monitor"],
    },
  }),
});

const execution = await executeResponse.json();
const executionId = execution.data.executionId;

// 2. Check if suspended
if (execution.data.status === "suspended") {
  console.log("Workflow suspended:", execution.data.suspension.reason);

  // 3. Get manager approval (external process)
  const approval = await getManagerApproval();

  // 4. Resume workflow
  const resumeResponse = await fetch(`/workflows/order-approval/executions/${executionId}/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resumeData: {
        approved: approval.approved,
        managerId: approval.managerId,
        comments: approval.comments,
      },
    }),
  });

  const finalResult = await resumeResponse.json();
  console.log("Final result:", finalResult.data.result);
}
```

## Best Practices

1. **Use streaming for long workflows** - Monitor progress in real-time
2. **Handle suspension gracefully** - Save execution IDs for resume
3. **Validate input against schema** - Check workflow schema before execution
4. **Implement proper error handling** - Check status and handle errors
5. **Use meaningful execution IDs** - Help with debugging and tracking
6. **Clean up suspended workflows** - Implement timeout/cleanup logic

## Next Steps

- Learn about [Authentication](../authentication.md) to secure workflow endpoints
- Explore [Streaming](../streaming.md) for real-time workflow monitoring
- Check [Agent Endpoints](./agents.md) for agent-workflow integration
