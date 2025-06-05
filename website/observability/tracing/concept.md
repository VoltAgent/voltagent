---
title: Concept
---

In VoltOps, a trace is a record of the entire process from a user's request to the system's response. Each trace captures all steps, decisions, and data flow from the beginning to the end of a single user interaction.

## Core Trace Features

**📋 Unique Session Identity**
Each trace is identified with a unique session ID and maintains complete context throughout the interaction lifecycle.

**🏷️ Flexible Organization**
Traces support tagging and metadata for easy categorization and filtering across your AI workflows.

**⚡ Real-time Visibility**
VoltOps captures and visualizes traces in real-time, enabling instant monitoring and issue detection.

**🔗 Hierarchical Structure**
Agents, tools, memory operations, and retrievers are organized in meaningful hierarchies that reflect your AI application's logic.

**📊 Complete Lifecycle Tracking**
From start to finish, traces monitor status changes, performance metrics, and outcomes.

## Information Captured in Traces

### Session and Context Data

- **User Identity**: User ID, profile information, and preferences
- **Conversation Context**: Conversation ID, history references, and session state
- **Input/Output Flow**: Original requests, system responses, and data transformations
- **Custom Metadata**: Priority levels, source channels, departments, and domain-specific information

### Performance and Cost Metrics

- **Token Usage**: Prompt tokens, completion tokens, and total consumption
- **Timing Data**: Processing times, response latency, and execution duration
- **Cost Analysis**: API call costs and resource consumption
- **Efficiency Metrics**: Cache hits, search times, and optimization scores

### Error and Status Information

- **Status Tracking**: Running, completed, or error states with timestamps
- **Error Details**: Messages, codes, and failure stages
- **Success Metrics**: Completion rates, confidence scores, and quality indicators
- **Audit Trail**: Decision points and state transitions

Traces eliminate the "black box" nature of AI applications by providing complete transparency and enabling you to manage your systems with confidence.

## VoltOps vs General Observability Concepts

VoltOps tracing builds upon established observability concepts but adapts them specifically for AI agent workflows. Understanding how VoltOps concepts map to general observability terms helps you leverage existing knowledge while working with AI-native structures.

### Concept Mapping

**VoltOps Trace ≡ General Trace**
Both represent a complete user interaction session from request to response, maintaining unique identifiers, timestamps, and hierarchical organization.

**VoltOps Agent ≈ Span + Generation**
An agent functions as both a span (tracking execution and hierarchy) and a generation (capturing AI model interactions with parameters, token usage, and responses).

**VoltOps Tools/Memory/Retrievers ≈ Spans**
These operations behave like traditional spans, tracking execution time, success/error states, input/output data, and nested hierarchies.

**VoltOps Success/Error Events ≈ Discrete Events**
Status changes function as timestamped events marking state transitions and providing audit trails.

### VoltOps Advantages for AI Applications

**AI-Native Structure**
Organizes data around AI concepts (agents, tools, memory) that directly correspond to how developers think about AI workflows.

**Semantic Hierarchy**
Creates meaningful hierarchies that reflect business logic rather than just technical call stacks.

**Context Preservation**
Maintains conversation history, user profiles, and decision context throughout the entire trace lifecycle.

**Performance Optimization**
Built-in tracking of AI-specific metrics like token usage, model costs, and inference latency.
