# VoltAgent Cloudflare Workers Deployment Example

This example demonstrates how to deploy a VoltAgent AI agent to Cloudflare Workers using in-memory storage adapters for edge-compatible, serverless deployment.

## Features

- 🚀 **Edge Deployment**: Runs on Cloudflare's global network for low-latency responses
- 💾 **In-Memory Storage**: Uses lightweight in-memory adapters perfect for serverless
- 🤖 **OpenAI Integration**: Powered by GPT-4 models via OpenAI API
- 🔍 **Vector Search**: In-memory vector search for semantic queries
- 🛠️ **Built-in Tools**: Example weather tool to demonstrate capabilities
- 📊 **Health Monitoring**: Health check and info endpoints
- 🌍 **Global Scale**: Deploy to 300+ cities worldwide

## Prerequisites

- Node.js 20+ installed
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier available)
- [OpenAI API key](https://platform.openai.com/api-keys)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (installed via npm)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and add your OpenAI API key:

```bash
cp .env.example .dev.vars
```

Edit `.dev.vars` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-your-openai-api-key-here
```

If you plan to connect to VoltOps while developing locally, you can also add:

```
VOLTAGENT_PUBLIC_KEY=pub-...
VOLTAGENT_SECRET_KEY=sec-...
```

### 3. Local Development

Start the development server locally:

```bash
npm run dev
```

Your agent will be available at `http://localhost:8787`

Test the agent:

```bash
# Health check
curl http://localhost:8787/health

# Get agent info
curl http://localhost:8787/info

# List available agents
curl http://localhost:8787/agents

# Chat with the agent
curl -X POST http://localhost:8787/agents/agent/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is the weather in Paris, France?"}]
  }'
```

### 4. Deploy to Cloudflare Workers

#### First-time Setup

1. Login to Cloudflare:

```bash
npx wrangler login
```

2. Set your OpenAI API key as a secret:

```bash
npx wrangler secret put OPENAI_API_KEY
# Paste your API key when prompted
```

Optional (only if you are connecting to VoltOps):

```bash
npx wrangler secret put VOLTAGENT_PUBLIC_KEY
npx wrangler secret put VOLTAGENT_SECRET_KEY
```

#### Deploy

Deploy to development environment:

```bash
npm run deploy
```

Deploy to production:

```bash
npm run deploy:production
```

Your agent will be deployed to a URL like: `https://voltagent-cloudflare.your-subdomain.workers.dev`

## Project Structure

```
with-cloudflare-deployment/
├── src/
│   └── index.ts          # Main agent configuration and Cloudflare export
├── wrangler.toml         # Cloudflare Workers configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .dev.vars            # Local development secrets (not committed)
├── .env.example         # Example environment variables
└── README.md           # This file
```

## Configuration

### wrangler.toml

The `wrangler.toml` file configures your Cloudflare Worker:

- **name**: Your worker's name (used in the URL)
- **compatibility_date**: Ensures consistent runtime behavior
- **secrets**: Managed via `wrangler secret put` (see deployment steps)

### Memory Configuration

This example uses in-memory storage adapters:

```typescript
const memory = new Memory({
  storage: new InMemoryStorageAdapter(),
  embedding: "openai/text-embedding-3-small",
  vector: new InMemoryVectorAdapter(),
});
```

**Note**: In-memory storage is reset when the worker restarts. For persistent storage, consider:

- Cloudflare KV for key-value storage
- Cloudflare D1 for SQL database
- Cloudflare Durable Objects for stateful storage

## Advanced Features

### Adding Persistent Storage

To add Cloudflare KV for persistence:

1. Create a KV namespace:

```bash
npx wrangler kv:namespace create "CONVERSATION_STORE"
```

2. Add to `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CONVERSATION_STORE"
id = "your-namespace-id"
```

3. Update your code to use KV storage adapter

### Custom Tools

Add custom tools to your agent:

```typescript
const customTool = {
  name: "toolName",
  description: "Tool description",
  parameters: z.object({
    param: z.string(),
  }),
  execute: async ({ param }) => {
    // Tool logic here
    return result;
  },
};

const agent = new Agent({
  // ...
  tools: [weatherTool, customTool],
});
```

### Rate Limiting

The example includes basic rate limiting configuration. Adjust in `wrangler.toml`:

```toml
[[unsafe.bindings]]
name = "RATE_LIMITER"
type = "ratelimit"
namespace_id = "1"
simple = { limit = 100, period = 60 }  # 100 requests per minute
```

## Monitoring

### View Real-time Logs

```bash
npm run tail
```

### Cloudflare Dashboard

Monitor your worker's performance in the [Cloudflare Dashboard](https://dash.cloudflare.com):

- Request metrics
- CPU time usage
- Error tracking
- Geographic distribution

## CI/CD with GitHub Actions

See `.github/workflows/deploy.yml` for automated deployment setup.

1. Add your Cloudflare API token as a GitHub secret: `CLOUDFLARE_API_TOKEN`
2. Push to main branch to trigger automatic deployment

## Troubleshooting

### Common Issues

1. **"Script startup exceeded CPU time limit"**
   - Optimize initialization code
   - Move heavy operations to request handlers

2. **"Cannot find module"**
   - Ensure all dependencies are bundled
   - Check `nodejs_compat` flag in wrangler.toml

3. **"Memory limit exceeded"**
   - Reduce in-memory storage limits
   - Consider using external storage (KV, D1)

4. **CORS Issues**
   - CORS is handled by Hono automatically
   - For custom headers, modify the server configuration

### Debug Mode

Enable detailed logging in development:

```typescript
const logger = createPinoLogger({
  name: "cloudflare-agent",
  level: "debug", // Change to "debug"
});
```

## Performance Tips

1. **Cold Starts**: Minimize dependencies and initialization code
2. **Memory Usage**: Keep in-memory storage limits reasonable
3. **CPU Time**: Optimize tool execution and avoid blocking operations
4. **Bundling**: Wrangler automatically bundles and tree-shakes code

## Costs

Cloudflare Workers Free Tier includes:

- 100,000 requests/day
- 10ms CPU time per invocation

For production usage, consider the [Paid plan](https://developers.cloudflare.com/workers/platform/pricing/).

## Resources

- [VoltAgent Documentation](https://voltagent.ai)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/commands/)
- [Hono Framework](https://hono.dev/)

## License

MIT
