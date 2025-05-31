# VoltAgent SDK - Trace and Agent Hierarchy Example

This example demonstrates all features of the VoltAgent SDK's new trace-based API in a comprehensive way.

## 🌟 Features

### ✅ Demonstrated Features

- **Trace Creation**: Top-level traces for projects/workflows
- **Agent Hierarchy**: Main agents and multi-level sub-agents
- **Tool Operations**: API calls and external service monitoring
- **Memory Operations**: Data storage and caching operations
- **Retriever Operations**: Data search and retrieval operations
- **Success/Error Handling**: Success and error state management
- **Auto Flush**: Automatic event submission
- **Hierarchical Relationships**: Parent-child relationships

### 📋 Included Examples

1. **Basic Trace Example**

   - Weather query workflow
   - Main agent + tool + memory operations
   - Success/error handling

2. **Complex Multi-Agent Hierarchy**

   - Research project coordination
   - 5-level agent hierarchy
   - Multiple tool/memory/retriever operations
   - Sub-agent coordination

3. **Error Handling Example**
   - Failed API calls
   - Agent error propagation
   - Trace error termination

## 🚀 Installation and Running

### Requirements

- Node.js 18+
- TypeScript
- VoltAgent API keys

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Environment Configuration

Edit the `.env` file:

```env
VOLTAGENT_PUBLIC_KEY=your_public_key_here
VOLTAGENT_SECRET_KEY=your_secret_key_here
VOLTAGENT_BASE_URL=https://api.voltagent.ai
DEBUG=true
```

### Running

```bash
# Run in development mode
npm run dev

# Or run directly
npm run trace

# Build and run
npm run build
npm start
```

## 🏗️ Code Structure

### SDK Initialization

```typescript
const sdk = new VoltAgentObservabilitySDK({
  baseUrl: process.env.VOLTAGENT_BASE_URL,
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
  autoFlush: true, // Automatic event submission
  flushInterval: 3000, // Send every 3 seconds
});
```

### Trace Creation

```typescript
const trace = await sdk.trace({
  name: "Simple Weather Query",
  agentId: "weather-agent-v1",
  input: { query: "What's the weather in Istanbul?" },
  userId: "user-123",
  conversationId: "conv-456",
  tags: ["weather", "basic-example"],
  metadata: { source: "sdk-example" },
});
```

### Agent Hierarchy

```typescript
// Main agent
const coordinator = await trace.addAgent({
  name: "Research Coordinator",
  model: "gpt-4",
});

// Sub-agent
const dataCollector = await coordinator.addAgent({
  name: "Data Collection Agent",
});

// Sub-sub-agent
const paperAnalyzer = await dataCollector.addAgent({
  name: "Academic Paper Analyzer",
});
```

### Tool/Memory/Retriever Operations

```typescript
// Tool usage
const weatherTool = await agent.addTool({
  name: "weather-api",
  input: { city: "Istanbul" },
});
await weatherTool.success({ temperature: 22 });

// Memory operation
const memoryOp = await agent.addMemory({
  name: "cache-weather-data",
  input: { key: "weather_istanbul", value: data },
});
await memoryOp.success({ cached: true });

// Retriever usage
const retriever = await agent.addRetriever({
  name: "research-planning-retriever",
  input: { query: "AI research best practices" },
});
await retriever.success({ documents: [...] });
```

## 📊 Example Output

When you run the example, you'll see output similar to this:

```
🌟 VoltAgent SDK - Comprehensive Trace and Agent Hierarchy Examples
======================================================================

🚀 Basic Trace and Agent Example Starting...
✅ Trace created: trace-123
✅ Main agent added: agent-456
🔧 Weather tool started: tool-789
✅ Weather tool success: 22°C, sunny
💾 Memory operation started: memory-012
✅ Memory operation successful
✅ Main agent completed
🎉 Trace completed: trace-123

🌟 Complex Multi-Agent Hierarchy Example Starting...
✅ Research trace created: trace-345
👑 Coordinator agent created: agent-678
🔍 Planning retriever started: retriever-901
📊 Data collector sub-agent created: agent-234
🔍 Web search tool started: tool-567
✅ Web search successful: 3 results found
📚 Academic paper analyzer (sub-sub-agent) created: agent-890
🔬 Paper analysis tool started: tool-123
🌍 Translation sub-agent created: agent-456
...
🎉 Complex hierarchy trace completed: trace-345

⚠️ Error Handling Example Starting...
❌ Tool error recorded
❌ Agent error recorded
❌ Trace terminated with error

✅ All examples completed!
📤 All events sent
🔒 SDK shutdown
```

## 🎯 Use Cases

### 1. Simple Workflow Tracking

- API calls
- Data processing pipelines
- Basic automation tasks

### 2. Multi-Agent Systems

- Complex research projects
- Data analysis workflows
- Multi-AI agent coordination

### 3. Error Monitoring

- Failed operation tracking
- Error propagation analysis
- Debug and troubleshooting

## 🔧 Development

### Testing

```bash
npm test
```

### Debug Mode

Set `DEBUG=true` in your environment to see detailed logs.

### Custom Scenarios

Edit `src/index.ts` to add your own scenarios.

## 📚 More Information

- [VoltAgent SDK Documentation](../../packages/sdk/README.md)
- [API Reference](../../packages/sdk/src/types.ts)
- [Test Examples](../../packages/sdk/src/__tests__/)

## 🤝 Contributing

To improve this example:

1. Add new scenarios
2. Expand error handling cases
3. Make performance optimizations
4. Improve documentation

## 📝 License

MIT License - see the main project license for details.
