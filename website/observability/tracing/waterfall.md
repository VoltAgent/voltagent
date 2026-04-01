---
title: Waterfall View
---

# Waterfall View

Use Waterfall to understand timing and execution order. It shows spans as a hierarchy so you can see where time is spent, how retries fan out, and which step failed first.

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/docs/observability/tracing/waterfall.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

Use Waterfall when you need the root cause of a failure or a latency spike. The details panel gives the context you need to confirm tool usage, memory behavior, and LLM settings without digging through logs.

Key signals to check:

- **Failure path**: error badges + child spans to see the first break and its causes.
- **Latency hotspots**: duration bars and timing to find the slowest steps.
- **Model context**: input/output and UI vs model messages to verify prompts and responses.
- **Configuration**: LLM config, memory config, and knowledge base usage for this span.
