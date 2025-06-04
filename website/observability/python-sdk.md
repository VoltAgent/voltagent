---
title: Python SDK
---

# Python SDK

Track your AI agents with full observability - traces, sub-agents, tools, memory operations, and more.

## Installation

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

```bash
pip install voltagent
```

## Setup

Initialize the SDK with your credentials:

```python
import asyncio
from voltagent import VoltAgentSDK

async def main():
    sdk = VoltAgentSDK(
        base_url="https://api.voltagent.dev",
        public_key="your-public-key",
        secret_key="your-secret-key",
        auto_flush=True,  # Auto-send events
        flush_interval=3,  # Send every 3 seconds
        timeout=30,
    )

if __name__ == "__main__":
    asyncio.run(main())
```

:::info Prerequisites
Before using the SDK, you need to create an account at [https://console.voltagent.dev/](https://console.voltagent.dev/) and set up an organization and project to get your API keys.
:::

## Two Usage Approaches

The Python SDK supports two approaches for resource management:

<Tabs>
  <TabItem value="context-manager" label="Context Manager (Recommended)" default>

Automatic resource management with async context managers:

```python
# Automatic resource management with async context managers
async with sdk.trace(
    agentId="my-agent",
    input={"query": "example"}
) as trace:
    # trace is automatically ended when exiting the context
    pass
```

**Benefits:**

<ul>
<li>Automatic cleanup and error handling</li>
<li>Pythonic and clean code</li>
<li>Exception safety</li>
<li>Recommended for most use cases</li>
</ul>

  </TabItem>
  <TabItem value="manual" label="Manual Management">

Manual resource management for more control:

```python
# Manual resource management for more control
trace = await sdk.create_trace(
    agentId="my-agent",
    input={"query": "example"}
)
try:
    # Your logic here
    pass
finally:
    await trace.end(status=TraceStatus.COMPLETED)
```

**Benefits:**

<ul>
<li>Fine-grained control over resource lifecycle</li>
<li>Better for long-running processes</li>
<li>Explicit error handling</li>
<li>Useful when you need custom cleanup logic</li>
</ul>

  </TabItem>
</Tabs>

## Step-by-Step Guide

### Create a Trace

A trace represents one complete agent execution session. Every agent operation must happen within a trace.

<Tabs>
  <TabItem value="context-manager" label="Context Manager" default>

```python
async with sdk.trace(
    agentId="support-agent-v1",
    input={"query": "How to reset password?"},
    userId="user-123",
    conversationId="conv-456",
    tags=["support", "password-reset"],
    metadata={
        "priority": "high",
        "source": "web-chat",
    },
) as trace:
    print(f"Trace created: {trace.id}")
    # Trace automatically ends when exiting context
```

  </TabItem>
  <TabItem value="manual" label="Manual">

```python
from voltagent import TraceStatus

trace = await sdk.create_trace(
    agentId="support-agent-v1",
    input={"query": "How to reset password?"},
    userId="user-123",
    conversationId="conv-456",
    tags=["support", "password-reset"],
    metadata={
        "priority": "high",
        "source": "web-chat",
    },
)

try:
    print(f"Trace created: {trace.id}")
    # Your agent logic here
finally:
    await trace.end(
        status=TraceStatus.COMPLETED,
        output={"result": "Query resolved successfully"},
    )
```

  </TabItem>
</Tabs>

![Trace creation in dashboard](https://cdn.voltagent.dev/docs/sdk-doc-demo-screenshots/trace-start.png)

### Add an Agent to the Trace

Now let's add the main agent that will handle the user's request:

```python
agent = await trace.add_agent({
    "name": "Support Agent",
    "input": {"query": "User needs password reset help"},
    "instructions": "You are a customer support agent specialized in helping users with account issues and password resets.",
    "metadata": {
        "modelParameters": {
            "model": "gpt-4",
        },
    },
})
```

![Trace with first agent](https://cdn.voltagent.dev/docs/sdk-doc-demo-screenshots/first-agent.png)

### Understanding Agent Metadata

Agent metadata helps you organize and filter your observability data. Here's what each field means:

<ul>
<li><strong><code>modelParameters</code></strong>: Built-in SDK field for model configuration (model name, temperature, etc.)</li>
<li><strong>Custom fields</strong>: Add any domain-specific metadata for your use case (user-defined)</li>
</ul>

```python
metadata = {
    # Built-in SDK field
    "modelParameters": {
        "model": "gpt-4",
        "temperature": 0.7,
        "max_tokens": 1000,
    },
    # Your own custom metadata (examples)
    "user_session": "session_abc123",
    "priority": "high",
    "department": "customer-success",
    "region": "us-east-1",
}
```

![Agent metadata in dashboard](https://cdn.voltagent.dev/docs/sdk-doc-demo-screenshots/agent-metadata.png)

> **💡 Trace Completion**
>
> <Tabs>
>   <TabItem value="context-completion" label="Context Manager (Automatic)" default>
>
> ```python
> async with sdk.trace(agentId="agent") as trace:
>     # Trace automatically ends with SUCCESS when exiting normally
>     # Automatically ends with ERROR if exception occurs
>     pass
> ```
>
>   </TabItem>
>   <TabItem value="manual-completion" label="Manual (Explicit)">
>
> ```python
> # Success
> await trace.end(
>     status=TraceStatus.COMPLETED,
>     output={"result": "Query resolved successfully"},
>     usage=TokenUsage(prompt_tokens=150, completion_tokens=85, total_tokens=235),
> )
>
> # Error
> await trace.end(
>     status=TraceStatus.ERROR,
>     output={"error": "Failed to process query"},
>     metadata={"errorCode": "TIMEOUT"},
> )
> ```
>
>   </TabItem>
> </Tabs>

### Add a Tool to the Agent

Tools represent external services or APIs that your agent uses. Let's add a knowledge base search tool:

```python
search_tool = await agent.add_tool({
    "name": "knowledge-base-search",
    "input": {
        "query": "password reset procedure",
        "max_results": 5,
    },
    "metadata": {
        # Add your own custom metadata
        "search_type": "semantic",
        "database": "support-kb",
        "version": "v2",
    },
})
```

![Agent with tools](https://cdn.voltagent.dev/docs/sdk-doc-demo-screenshots/with-tools.png)

#### Tool Success

When the tool executes successfully:

```python
await search_tool.success(
    output={
        "results": ["Reset via email", "Reset via SMS", "Contact support"],
        "count": 3,
        "relevance_score": 0.89,
    },
    metadata={
        "search_time": "0.2s",
        "index_used": "support-kb-v2",
    },
)
```

![Agent with tools success](https://cdn.voltagent.dev/docs/sdk-doc-demo-screenshots/with-tools-success.png)

#### Tool Error

When the tool fails, you can report errors in two ways:

<Tabs>
  <TabItem value="exception-error" label="Using Exception" default>

```python
await search_tool.error(
    status_message=Exception("Database connection timeout"),
    metadata={
        "database": "support-kb",
        "timeout_ms": 5000,
    },
)
```

  </TabItem>
  <TabItem value="structured-error" label="Using Structured Error">

```python
await search_tool.error(
    status_message={
        "message": "Database connection timeout",
        "code": "DB_TIMEOUT",
        "details": {"timeout_ms": 5000},
    },
    metadata={
        "database": "support-kb",
        "timeout_ms": 5000,
    },
)
```

  </TabItem>
</Tabs>

![Agent with tools error](https://cdn.voltagent.dev/docs/sdk-doc-demo-screenshots/with-tools-error.png)

### Add Memory Operations

Memory operations track data storage and retrieval. They work exactly like tools with success and error states:

```python
memory_op = await agent.add_memory({
    "name": "user-context-storage",
    "input": {
        "key": "user_123_context",
        "value": {
            "last_login": "2024-01-15",
            "account_type": "premium",
            "preferences": {"language": "en"},
        },
        "ttl": 3600,  # 1 hour
    },
    "metadata": {
        "type": "redis",
        "region": "us-east-1",
    },
})
```

![Agent with memory](https://cdn.voltagent.dev/docs/sdk-doc-demo-screenshots/with-memory.png)

#### Memory Success

```python
await memory_op.success(
    output={
        "stored": True,
        "key": "user_123_context",
        "expires_at": "2024-01-15T15:00:00Z",
    },
    metadata={
        "cache_hit": False,
        "storage_latency": "2ms",
    },
)
```

![Agent with memory success](https://cdn.voltagent.dev/docs/sdk-doc-demo-screenshots/with-memory-success.png)

#### Memory Error

```python
await memory_op.error(
    status_message=Exception("Redis connection failed"),
    metadata={
        "storage_type": "redis",
        "error_code": "CONNECTION_TIMEOUT",
    },
)
```

### Add Retrieval Operations

Retrievers handle data retrieval from vector stores, databases, or knowledge bases. They also follow the same success/error pattern:

```python
retriever = await agent.add_retriever({
    "name": "policy-document-retriever",
    "input": {
        "query": "password reset policy for premium users",
        "max_documents": 3,
        "threshold": 0.8,
    },
    "metadata": {
        "vector_store": "pinecone",
        "embedding_model": "text-embedding-ada-002",
    },
})
```

![Agent with retriever](https://cdn.voltagent.dev/docs/sdk-doc-demo-screenshots/with-retriever.png)

#### Retriever Success

```python
await retriever.success(
    output={
        "documents": [
            "Premium users can reset passwords instantly via email",
            "Password reset requires 2FA verification for premium accounts",
            "Premium users have 24/7 phone support for password issues",
        ],
        "relevance_scores": [0.95, 0.88, 0.82],
    },
    metadata={
        "search_time": "0.3s",
        "documents_scanned": 1500,
    },
)
```

#### Retriever Error

```python
await retriever.error(
    status_message=Exception("Vector store unavailable"),
    metadata={
        "vector_store": "pinecone",
        "error_type": "SERVICE_UNAVAILABLE",
    },
)
```

### Working with Sub-Agents

Sub-agents create hierarchical agent structures. Each sub-agent can have its own tools, memory operations, and even more sub-agents:

```python
# Create a sub-agent under the main agent
policy_checker = await agent.add_agent({
    "name": "Policy Checker",
    "input": {
        "user_id": "user-123",
        "request_type": "password-reset",
    },
    "instructions": "You are responsible for verifying customer requests against company policies.",
    "metadata": {
        "role": "policy-verification",
        "modelParameters": {
            "model": "gpt-4",
        },
    },
})
```

![Agent with subagents](https://cdn.voltagent.dev/docs/sdk-doc-demo-screenshots/with-subagents.png)

#### Sub-Agent Success

```python
from voltagent import TokenUsage

await policy_checker.success(
    output={
        "policy_compliant": True,
        "required_verification": "2fa-sms",
        "approval_granted": True,
    },
    usage=TokenUsage(
        prompt_tokens=85,
        completion_tokens=45,
        total_tokens=130,
    ),
    metadata={
        "policies_checked": ["password-policy", "premium-user-policy"],
        "compliance_score": 0.95,
    },
)
```

![Agent with subagents success](https://cdn.voltagent.dev/docs/sdk-doc-demo-screenshots/with-subagents-success.png)

#### Sub-Agent Error

```python
await policy_checker.error(
    status_message=Exception("Policy verification failed"),
    stage="policy_check",
    metadata={
        "failed_policies": ["premium-user-policy"],
        "error_code": "POLICY_VIOLATION",
    },
)
```

#### Creating Deeper Hierarchies

You can create multiple levels of sub-agents:

```python
# Sub-sub-agent under policy checker
verifier = await policy_checker.add_agent({
    "name": "2FA Verifier",
    "input": {"user_id": "user-123"},
    "instructions": "You handle two-factor authentication verification processes.",
    "metadata": {
        "role": "two-factor-auth",
        "modelParameters": {
            "model": "gpt-3.5-turbo",
        },
    },
})
```

![Agent with subagents-subagents](https://cdn.voltagent.dev/docs/sdk-doc-demo-screenshots/with-subagents-subagents.png)

### Complete the Agent and Trace

Finally, complete your main agent and trace:

<Tabs>
  <TabItem value="context-completion" label="Context Manager" default>

```python
# Complete the main agent
await agent.success(
    output={
        "response": "Password reset link sent to user's email",
        "action_taken": "email-reset-link",
        "user_satisfied": True,
    },
    usage=TokenUsage(
        prompt_tokens=150,
        completion_tokens=85,
        total_tokens=235,
    ),
    metadata={
        "response_time": "2.1s",
        "confidence_score": 0.95,
    },
)

# Trace automatically completes when exiting context manager
```

  </TabItem>
  <TabItem value="manual-completion" label="Manual">

```python
# Complete the main agent
await agent.success(
    output={
        "response": "Password reset link sent to user's email",
        "action_taken": "email-reset-link",
        "user_satisfied": True,
    },
    usage=TokenUsage(
        prompt_tokens=150,
        completion_tokens=85,
        total_tokens=235,
    ),
    metadata={
        "response_time": "2.1s",
        "confidence_score": 0.95,
    },
)

# Manually complete the trace
await trace.end(
    status=TraceStatus.COMPLETED,
    output={
        "result": "Customer support query resolved successfully",
        "resolution": "password-reset-completed",
    },
    usage=TokenUsage(
        prompt_tokens=150,
        completion_tokens=85,
        total_tokens=235,
    ),
    metadata={
        "total_agents": 2,
        "total_operations": 4,
        "success_rate": 1.0,
    },
)
```

  </TabItem>
</Tabs>

![Agent with success](https://cdn.voltagent.dev/docs/sdk-doc-demo-screenshots/with-success.png)

## Best Practices

<ol>
<li><strong>Use context managers when possible</strong> - They provide automatic resource cleanup</li>
<li><strong>Always call <code>await sdk.flush()</code></strong> before your application exits</li>
<li><strong>Use meaningful names</strong> for traces, agents, tools, and operations</li>
<li><strong>Include relevant metadata</strong> for debugging and analytics</li>
<li><strong>Track token usage</strong> in the <code>usage</code> field, not metadata</li>
<li><strong>Handle errors properly</strong> with descriptive error messages</li>
<li><strong>Use hierarchical agents</strong> for complex workflows</li>
<li><strong>Set appropriate tags</strong> for easy filtering and search</li>
<li><strong>Use type hints</strong> for better code maintainability</li>
<li><strong>Handle asyncio properly</strong> in your application lifecycle</li>
</ol>

## Complete Examples

<Tabs>
  <TabItem value="context-example" label="Context Manager Example" default>

```python
import asyncio
import os
from voltagent import VoltAgentSDK, TokenUsage

async def context_manager_example():
    sdk = VoltAgentSDK(
        base_url=os.getenv("VOLTAGENT_BASE_URL", "https://api.voltagent.dev"),
        public_key=os.getenv("VOLTAGENT_PUBLIC_KEY"),
        secret_key=os.getenv("VOLTAGENT_SECRET_KEY"),
        auto_flush=True,
    )

    try:
        # Context manager automatically handles trace lifecycle
        async with sdk.trace(
            agentId="example-agent",
            input={"query": "Show me how to use the SDK"},
        ) as trace:

            # Add agent
            agent = await trace.add_agent({
                "name": "Example Agent",
                "input": {"task": "Demonstrate SDK usage"},
                "instructions": "You demonstrate how to use the VoltAgent SDK effectively.",
                "metadata": {
                    "modelParameters": {"model": "gpt-4"},
                },
            })

            # Add tool
            tool = await agent.add_tool({
                "name": "example-tool",
                "input": {"action": "demonstrate"},
            })

            await tool.success(
                output={"result": "Tool executed successfully"},
            )

            # Complete agent
            await agent.success(
                output={"response": "SDK demonstration completed"},
                usage=TokenUsage(prompt_tokens=50, completion_tokens=30, total_tokens=80),
            )

            # Trace automatically completes here

    except Exception as error:
        print(f"Example failed: {error}")
    finally:
        await sdk.shutdown()

if __name__ == "__main__":
    asyncio.run(context_manager_example())
```

  </TabItem>
  <TabItem value="manual-example" label="Manual Management Example">

```python
import asyncio
import os
from voltagent import VoltAgentSDK, TokenUsage, TraceStatus

async def manual_example():
    sdk = VoltAgentSDK(
        base_url=os.getenv("VOLTAGENT_BASE_URL", "https://api.voltagent.dev"),
        public_key=os.getenv("VOLTAGENT_PUBLIC_KEY"),
        secret_key=os.getenv("VOLTAGENT_SECRET_KEY"),
        auto_flush=True,
    )

    # Create trace manually
    trace = await sdk.create_trace(
        agentId="example-agent",
        input={"query": "Show me how to use the SDK"},
    )

    try:
        # Add agent
        agent = await trace.add_agent({
            "name": "Example Agent",
            "input": {"task": "Demonstrate SDK usage"},
            "instructions": "You demonstrate how to use the VoltAgent SDK effectively.",
            "metadata": {
                "modelParameters": {"model": "gpt-4"},
            },
        })

        # Add tool
        tool = await agent.add_tool({
            "name": "example-tool",
            "input": {"action": "demonstrate"},
        })

        await tool.success(
            output={"result": "Tool executed successfully"},
        )

        # Complete agent
        await agent.success(
            output={"response": "SDK demonstration completed"},
            usage=TokenUsage(prompt_tokens=50, completion_tokens=30, total_tokens=80),
        )

        # Manually complete trace
        await trace.end(
            status=TraceStatus.COMPLETED,
            output={"result": "Example completed successfully"},
            usage=TokenUsage(prompt_tokens=50, completion_tokens=30, total_tokens=80),
        )

    except Exception as error:
        print(f"Example failed: {error}")
        # Manually handle error
        await trace.end(
            status=TraceStatus.ERROR,
            metadata={"error": str(error)},
        )
    finally:
        await sdk.shutdown()

if __name__ == "__main__":
    asyncio.run(manual_example())
```

  </TabItem>
</Tabs>

## Environment Variables

For easier configuration, set these environment variables:

```bash
export VOLTAGENT_BASE_URL="https://api.voltagent.dev"
export VOLTAGENT_PUBLIC_KEY="your-public-key"
export VOLTAGENT_SECRET_KEY="your-secret-key"
```

Then initialize the SDK simply:

```python
sdk = VoltAgentSDK(
    base_url=os.getenv("VOLTAGENT_BASE_URL"),
    public_key=os.getenv("VOLTAGENT_PUBLIC_KEY"),
    secret_key=os.getenv("VOLTAGENT_SECRET_KEY"),
    auto_flush=True,
)
```

## Type Safety

The Python SDK provides comprehensive type hints for better development experience:

```python
from typing import Dict, Any, List, Optional
from voltagent import VoltAgentSDK, TokenUsage, TraceStatus

# SDK methods are fully typed
sdk: VoltAgentSDK = VoltAgentSDK(...)

# All data structures support type hints
metadata: Dict[str, Any] = {
    # Built-in SDK field for model configuration
    "modelParameters": {
        "model": "gpt-4",
        "temperature": 0.7,
    },
    # Custom user-defined fields (examples)
    "user_session_id": "session_123",
    "priority": "high",
    "environment": "production",
}

usage: TokenUsage = TokenUsage(
    prompt_tokens=100,
    completion_tokens=50,
    total_tokens=150,
)
```
