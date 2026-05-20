
## ❓ FAQ

### What is VoltAgent?

VoltAgent is an **end-to-end AI Agent Engineering Platform** consisting of two main parts:

- **Open-Source TypeScript Framework** – Memory, RAG, Guardrails, Tools, MCP, Voice, Workflow, and more.
- **VoltOps Console** (Cloud/Self-Hosted) – Observability, Automation, Deployment, Evals, Guardrails, Prompts, and more.

Build agents with full code control and ship them with production-ready visibility and operations.

### How does VoltAgent differ from other agent frameworks?

| Feature | VoltAgent | LangChain | CrewAI |
|---------|-----------|-----------|--------|
| Language | TypeScript | Python | Python |
| Architecture | Core + Console | Library | Multi-agent |
| Observability | VoltOps Console | LangSmith | Built-in |
| Deployment | One-click | Manual | Manual |
| Memory | Pluggable adapters | In-memory | Memory class |
| RAG | Built-in VoltAgent KB | External | External |
| Voice | Native support | External | External |
| MCP | Native integration | External | External |
| Guardrails | Built-in | External | External |
| Evals | Built-in suites | External | External |

### Core Framework Features

| Feature | Description |
|---------|-------------|
| **Core Runtime** (`@voltagent/core`) | Typed roles, tools, memory, model providers |
| **Workflow Engine** | Multi-step declarative automations |
| **Supervisors & Sub-Agents** | Specialized agents under supervisor coordination |
| **Tool Registry & MCP** | Zod-typed tools with lifecycle hooks, MCP integration |
| **LLM Compatibility** | Swap between OpenAI, Anthropic, Google by config |
| **Memory** | Durable memory adapters (LibSQL, etc.) |
| **Resumable Streaming** | Reconnect to in-flight streams |
| **Retrieval & RAG** | Pull facts from data sources, ground responses |
| **VoltAgent Knowledge Base** | Managed RAG service for document ingestion |
| **Voice** | TTS/STT with OpenAI, ElevenLabs, custom providers |
| **Guardrails** | Intercept and validate input/output |
| **Evals** | Run agent eval suites alongside workflows |

### VoltOps Console Features

| Feature | Description |
|---------|-------------|
| **Observability & Tracing** | Deep execution traces and performance metrics |
| **Dashboard** | Agent/workflow/system overview |
| **Logs** | Detailed execution logs |
| **Memory Management** | Inspect agent memory and conversation history |
| **Traces** | Complete execution analysis |
| **Prompt Builder** | Design and test prompts in console |
| **Deployment** | One-click GitHub integration |
| **Triggers & Actions** | Webhooks, schedules, custom triggers |
| **Monitoring** | Health, performance, resource metrics |
| **Guardrails** | Safety boundaries and content filters |
| **Evals** | Test agent behavior against benchmarks |
| **RAG (Knowledge Base)** | Built-in retrieval-augmented generation |

### What TypeScript/Node.js version is required?

- **Node.js**: 18+ (recommended)
- **TypeScript**: 5.0+
- Works with npm, yarn, pnpm

### What LLM providers are supported?

| Provider | Package | Model Example |
|----------|---------|---------------|
| OpenAI | `@ai-sdk/openai` | `gpt-4o-mini`, `gpt-4o` |
| Anthropic | `@ai-sdk/anthropic` | `claude-sonnet-4-20250514` |
| Google | `@ai-sdk/google` | `gemini-2.0-flash` |
| Azure | `@ai-sdk/azure` | Azure OpenAI deployments |
| Custom | `@ai-sdk/provider` | Custom provider integration |

### How do I get started?

**Quick Start:**
```bash
npm create voltagent-app@latest
```

Navigate to your project and run:
```bash
npm run dev
```

Visit [VoltOps Console](https://console.voltagent.dev) to interact with your agent.

### How do I use the MCP Docs Server?

Install the MCP docs server to teach your LLM how to use VoltAgent:
```bash
npm install @voltagent/mcp-docs-server
```

Configure your AI assistant (Claude Desktop, Cursor, Windsurf):
```json
{
  "mcpServers": {
    "voltagent": {
      "command": "npx",
      "args": ["-y", "@voltagent/mcp-docs-server"]
    }
  }
}
```

### What is the Memory system?

VoltAgent supports pluggable memory adapters:
- **LibSQL Memory Adapter** (`@voltagent/libsql`) – Persistent SQLite storage
- **In-memory** – Default, no persistence
- **Custom adapters** – Implement your own storage

Memory persists important context across agent runs.

### What is RAG in VoltAgent?

RAG (Retrieval-Augmented Generation) allows agents to:
- Pull facts from your data sources
- Ground responses before the model answers
- Use **VoltAgent Knowledge Base** for managed ingestion, chunking, embeddings, search

### What are Guardrails?

Guardrails intercept and validate agent input/output at runtime:
- Content policy enforcement
- Safety rules
- Output validation

### What are Evals?

Evals run agent evaluation suites alongside workflows:
- Measure agent behavior
- Test accuracy against benchmarks
- Improve performance

### What languages are supported?

VoltAgent documentation is available in:
- English (default)
- [繁體中文](i18n/README-cn-traditional.md)
- [简体中文](i18n/README-cn-bsc.md)
- [日本語](i18n/README-jp.md)
- [한국어](i18n/README-kr.md)

### Where can I learn more?

- **[Interactive Tutorial](https://voltagent.dev/tutorial/introduction/)** – Learn fundamentals
- **[Documentation](https://voltagent.dev/docs/)** – Guides, concepts, tutorials
- **[Examples](https://github.com/voltagent/voltagent/tree/main/examples)** – Practical implementations
- **[Blog](https://voltagent.dev/blog/)** – Technical insights and best practices

### License

MIT License – See [LICENSE](LICENSE) for details.

### Help Resources

- **Discord**: [Join community](https://s.voltagent.dev/discord)
- **GitHub Issues**: [Report bugs](https://github.com/VoltAgent/voltagent/issues)
- **GitHub Discussions**: [Ask questions](https://github.com/VoltAgent/voltagent/discussions)
