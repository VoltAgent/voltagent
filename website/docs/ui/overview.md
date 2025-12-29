---
title: UI Overview
sidebar_label: UI Overview
slug: /ui/overview
---

# UI Overview

VoltAgent ships example UIs and integration guides so you can plug your agents into a frontend quickly.

- [AI SDK Integration](./ai-sdk-integration.md): Wire VoltAgent streaming endpoints to the Vercel AI SDK chat primitives.
- [CopilotKit](./copilotkit.md): Use CopilotKit React components and tools with VoltAgent via the AG-UI adapter.
- [Assistant UI](./assistant-ui.md): Full-featured chat UI starter generated with `npx assistant-ui@latest create`, backed by VoltAgent.

## Grab a starter

Clone the examples directly with the CLI:

```bash
npm create voltagent-app@latest -- --example with-assistant-ui
npm create voltagent-app@latest -- --example with-nextjs
npm create voltagent-app@latest -- --example with-copilotkit
```

Need another stack? Browse more UIs and integrations in the [`examples`](https://github.com/VoltAgent/voltagent/tree/main/examples) directory.
