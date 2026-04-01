---
title: Trace Feedback
---

import MediaPanel from "@site/src/components/docs-widgets/MediaPanel";

# Trace Feedback

Use Feedback to tie human judgment to a specific trace so you can validate fixes and catch regressions early. It turns "this felt wrong" into a trackable signal you can compare across runs.

What to look at:

- **History and source**: confirm the trace was rated and where it came from (app, API, model).
- **Key and score**: keep signals consistent (for example, satisfaction) so you can compare runs.
- **Comments**: capture short context that explains why the output was good or bad.

<MediaPanel
  src="https://cdn.voltagent.dev/docs/observability/tracing/feedback.gif"
  alt="Trace feedback"
  width={520}
/>

<br/>
