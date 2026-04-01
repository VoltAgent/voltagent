---
title: Dashboard
---

# Dashboard

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/docs/voltop-docs/dashboard.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

The Analytics Dashboard provides real-time visibility into your AI agent performance, costs, and usage patterns. It organizes metrics into six sections: Overview, Cost & Usage, Latency, Tool Usage, Agent/Workflow Usage, and Prompt Analytics.

## Time Range Selection

Select a time range from the dropdown:

- 1 hour, 3 hours, 6 hours, 9 hours, 12 hours
- 1 day, 2 days, 3 days, 7 days, 14 days, 30 days
- Custom date range

Free plan users can access up to 7 days of data. 30-day analytics requires a Pro plan.

## Overview Section

### Trace Metrics Card

Displays aggregate statistics for all traces in the selected period:

| Metric       | Description                                        |
| ------------ | -------------------------------------------------- |
| Total Traces | Number of agent/workflow executions                |
| Success Rate | Percentage of traces that completed without errors |
| Error Count  | Number of failed traces                            |
| Avg Duration | Average execution time across all traces           |

### LLM Call Metrics Card

Summarizes LLM API call statistics:

| Metric       | Description                              |
| ------------ | ---------------------------------------- |
| Total Calls  | Number of LLM API requests               |
| Success Rate | Percentage of successful LLM calls       |
| Failed Calls | Number of LLM calls that returned errors |
| Avg Latency  | Average response time for LLM calls      |

### Trace Counts Chart

A time-series chart showing trace volume over time. Data points are color-coded by status:

- **Green**: Successful traces
- **Red**: Failed traces
- **Yellow**: In-progress traces

Click on a data point to filter traces by that time period.

### LLM Call Rates Chart

Shows LLM call volume over time, broken down by:

- Success vs failure
- Model provider (OpenAI, Anthropic, etc.)

## Cost & Usage Section

### LLM Cost Metrics Card

Displays cost breakdown for LLM usage:

| Metric        | Description                              |
| ------------- | ---------------------------------------- |
| Total Cost    | Sum of all LLM API costs                 |
| Cost by Model | Breakdown by model (GPT-4, Claude, etc.) |
| Cost Trend    | Comparison with previous period          |

### User Cost Metrics Card

Shows cost attribution by user:

| Metric        | Description                  |
| ------------- | ---------------------------- |
| Top Users     | Users with highest LLM costs |
| Cost per User | Average cost per active user |
| User Count    | Number of unique users       |

### Trace Cost Chart

Time-series chart of costs per trace execution. Helps identify:

- Cost spikes
- Expensive workflows
- Cost trends over time

### Token Usage Chart

Displays token consumption over time:

- **Prompt tokens**: Input tokens sent to LLM
- **Completion tokens**: Output tokens received from LLM
- **Total tokens**: Combined usage

## Latency Section

### Trace Latency Chart

Shows end-to-end execution time for traces:

- P50 (median)
- P90 (90th percentile)
- P99 (99th percentile)
- Average

### LLM Latency Chart

Displays LLM response times:

- By model
- By provider
- Percentile distribution

## Tool Usage Section

### Tool Analytics Charts

Visualizes tool execution patterns:

| Chart                  | Description                     |
| ---------------------- | ------------------------------- |
| Tool Call Distribution | Pie chart of tool usage by name |
| Tool Latency           | Average execution time per tool |
| Tool Success Rate      | Success/failure ratio per tool  |
| Tool Usage Over Time   | Time-series of tool calls       |

## Agent/Workflow Usage Section

### Agent Analytics Charts

Shows agent and workflow execution metrics:

| Chart              | Description                          |
| ------------------ | ------------------------------------ |
| Agent Distribution | Breakdown of runs by agent name      |
| Agent Success Rate | Success/failure ratio per agent      |
| Agent Latency      | Average execution time per agent     |
| Workflow Steps     | Average steps per workflow execution |

## Prompt Analytics Section

### Summary Cards

| Card          | Description                             |
| ------------- | --------------------------------------- |
| Total Prompts | Number of active prompts in the project |
| Total Usage   | All-time prompt execution count         |
| Success Rate  | Average success rate across all prompts |
| Total Cost    | Cumulative cost for prompt executions   |

### Top Prompts

Lists the most frequently used prompts with:

- Prompt name and type (chat/completion)
- Current version
- Usage count

Click a prompt to navigate to its detail page.

## Data Limitations

Free plan users see the first 100 records of the current month. A "Limited view" badge appears when data is truncated. Upgrade to Pro for full historical data access.
