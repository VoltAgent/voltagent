---
title: VoltAgent
---

# VoltAgent Framework Integration

VoltAgent Framework comes with **native observability support** built-in. No additional configuration or setup is required - observability is automatically enabled when you use VoltAgent Framework.

![VoltAgent Framework Observability](https://cdn.voltagent.dev/readme/demo.gif)

## Zero Configuration Required

VoltAgent Framework automatically provides:

- ✅ **Real-time monitoring** of all agent activities
- ✅ **Automatic logging** of conversations and tool usage
- ✅ **Multi-agent coordination** tracking
- ✅ **Performance metrics** and debugging information

## Quick Start

### Create a new VoltAgent application

```bash
npm create voltagent-app@latest my-agent-app
```

### Navigate to your project and start development

```bash
cd my-agent-app
npm run dev
```

### Observability is automatically enabled

You should see the VoltAgent server startup message in your terminal:

```bash
══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
  ✓ HTTP Server: http://localhost:3141

  Developer Console:    https://console.voltagent.dev
══════════════════════════════════════════════════
[VoltAgent] All packages are up to date
```

### Open the Developer Console

Visit [console.voltagent.dev](https://console.voltagent.dev/) to see your agent in real-time

**📚 [For detailed framework usage →](/docs/observability/developer-console/)**
