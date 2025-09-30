<div align="center">
  <h1>🎨 AI Ad Generator</h1>
  <p>Advanced Social Media Ad Generation powered by <a href="https://voltagent.dev">VoltAgent</a> & <a href="https://browserbase.com">BrowserBase</a></p>

  <p>
    <a href="https://github.com/voltagent/voltagent"><img src="https://img.shields.io/badge/built%20with-VoltAgent-blue" alt="Built with VoltAgent" /></a>
    <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node Version" /></a>
    <a href="https://browserbase.com"><img src="https://img.shields.io/badge/powered%20by-BrowserBase-purple" alt="Powered by BrowserBase" /></a>
  </p>
</div>

## 🚀 Overview

AI Ad Generator automatically creates professional social media advertisements from any website URL. Using advanced multi-agent AI architecture, it analyzes your landing page, develops creative strategies, and generates Instagram-optimized ads with Gemini.

### Key Features

- 🌐 **Intelligent Web Analysis**: Extracts brand information using BrowserBase Stagehand
- 🎯 **Instagram-Optimized Output**: Generates square (1:1) creatives tailored for the Instagram feed
- ⚡ **Automated Workflow**: Coordinates analysis, strategy, and production end-to-end
- 🧠 **Strategic AI**: Develops data-driven creative briefs and strategies
- 🎨 **Gemini Image Generation**: High-quality AI-generated visuals with reference screenshots

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Git
- OpenAI API Key - [Get yours here](https://platform.openai.com/api-keys)
- BrowserBase Account - [Sign up here](https://browserbase.com)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-ad-generator

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

### Configuration

Edit `.env` file with your API keys:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here
BROWSERBASE_API_KEY=your_browserbase_api_key_here
BROWSERBASE_PROJECT_ID=your_browserbase_project_id_here

# Optional - VoltOps Platform
# Get your keys at https://console.voltagent.dev/tracing-setup
VOLTAGENT_PUBLIC_KEY=your-public-key
VOLTAGENT_SECRET_KEY=your-secret-key

# Server Configuration
PORT=3000
```

### Running the Application

```bash
# Development mode (with hot reload)
npm run dev

# The server will start on http://localhost:3000
```

## 🏗️ Architecture

This application uses VoltAgent's multi-agent architecture:

### Specialized Agents

1. **Landing Page Analyzer** - Web scraping and brand extraction
2. **Ad Creator** - Synthesizes strategy and generates Instagram-ready creatives
3. **Supervisor** - Orchestrates the workflow between agents

### Technology Stack

- **VoltAgent**: Multi-agent AI framework
- **BrowserBase Stagehand**: Intelligent web automation
- **OpenAI GPT-4**: Agent intelligence
- **Google Gemini 2.5 Image**: Image generation
- **TypeScript**: Type-safe development

## 📡 API Usage

### Generate Ads via Supervisor Agent

```bash
curl -X POST http://localhost:3000/api/agents/AdGenerationSupervisor/generate-text \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Generate Instagram ads for https://example.com",
    "conversationId": "ad-session-1"
  }'
```

### Use the Workflow (Recommended)

```bash
curl -X POST http://localhost:3000/api/workflows/ad-generation/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "url": "https://example.com",
      "platforms": ["instagram"]
    }
  }'
```

### Stream Real-time Updates

```bash
curl -X POST http://localhost:3000/api/agents/AdGenerationSupervisor/stream-text \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Analyze and generate ads for https://example.com",
    "conversationId": "ad-session-1"
  }'
```

## 🔍 VoltOps Platform

### Local Development

The VoltOps Platform provides real-time observability for your agents during development:

1. **Start your agent**: Run `npm run dev`
2. **Open console**: Visit [console.voltagent.dev](https://console.voltagent.dev)
3. **Auto-connect**: The console connects to your local agent at `http://localhost:3141`

Features:

- 🔍 Real-time execution visualization
- 🐛 Step-by-step debugging
- 📊 Performance insights
- 💾 No data leaves your machine

### Production Monitoring

For production environments, configure VoltOpsClient:

1. **Create a project**: Sign up at [console.voltagent.dev/tracing-setup](https://console.voltagent.dev/tracing-setup)
2. **Get your keys**: Copy your Public and Secret keys
3. **Add to .env**:
   ```env
   VOLTAGENT_PUBLIC_KEY=your-public-key
   VOLTAGENT_SECRET_KEY=your-secret-key
   ```
4. **Configure in code**: The template already includes VoltOpsClient setup!

## 📁 Project Structure

```
ai-ad-generator/
├── src/
│   ├── index.ts                    # Main VoltAgent configuration
│   ├── lib/
│   │   └── stagehand-manager.ts   # BrowserBase session management
│   ├── agents/                     # Specialized AI agents
│   │   ├── landing-page-analyzer.agent.ts
│   │   ├── ad-creator.agent.ts
│   │   └── supervisor.agent.ts
│   ├── tools/                      # Agent tools
│   │   ├── browserbase/            # Web automation tools
│   │   │   ├── page-navigate.tool.ts
│   │   │   ├── page-extract.tool.ts
│   │   │   ├── page-observe.tool.ts
│   │   │   ├── page-act.tool.ts
│   │   │   └── screenshot.tool.ts
│   │   └── image-generation/       # Ad generation tools
│   │       └── instagram-ad-gemini.tool.ts
│   └── workflows/                  # Workflow definitions
│       └── ad-generation.workflow.ts
├── output/                         # Generated ads directory
│   ├── screenshots/
│   └── ads/
│       └── instagram/
├── .env                           # Environment variables
├── .voltagent/                    # Agent memory storage
└── package.json
```

## 📸 Output Examples

### Generated Files Structure

```
output/
├── screenshots/
│   └── screenshot_1234567890.png      # Landing page screenshot
├── ads/
│   └── instagram/
│       └── instagram_brandname_1234567890.png
```

### Example Workflow Output

```json
{
  "brandAnalysis": {
    "productName": "TechStart Pro",
    "tagline": "Innovate Faster, Scale Smarter",
    "valueProposition": "All-in-one platform for startups",
    "targetAudience": "Tech entrepreneurs and small teams"
  },
  "generatedAds": [
    {
      "platform": "instagram",
      "filepath": "output/ads/instagram/instagram_techstart_pro_1234567890.png",
      "style": "primary"
    }
  ],
  "summary": {
    "totalAdsGenerated": 1,
    "platforms": ["instagram"],
    "notes": "Single high-converting Instagram asset"
  }
}
```

## 🐳 Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t ai-ad-generator .

# Run container
docker run -p 3141:3141 --env-file .env ai-ad-generator

# Or use docker-compose
docker-compose up
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Run production build
- `npm run lint` - Check code quality
- `npm run lint:fix` - Auto-fix linting issues
- `npm run typecheck` - Run TypeScript type checking

### Customization Examples

#### Add New Ad Platforms

Create a new tool in `src/tools/image-generation/`:

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";

export const generateLinkedInAdTool = createTool({
  name: "generate_linkedin_ad",
  description: "Generate LinkedIn ad (1200x627)",
  parameters: z.object({
    productName: z.string(),
    tagline: z.string(),
    adConcept: z.string(),
    professional: z.boolean().default(true),
  }),
  execute: async ({ productName, tagline, adConcept }) => {
    // LinkedIn-specific ad generation logic
    // Return generated ad details
  },
});
```

#### Customize Agent Behavior

Modify agent instructions in `src/agents/`:

```typescript
export const createAdCreatorAgent = (memory: Memory) => {
  return new Agent({
    name: "AdCreator",
    instructions: `Your custom instructions here...`,
    // Add your custom tools
    tools: [generateLinkedInAdTool, ...otherTools],
    memory,
  });
};
```

## 🚨 Troubleshooting

### Common Issues

1. **BrowserBase Connection Errors**
   - Verify your API key and project ID are correct
   - Check BrowserBase service status
   - Ensure you have available browser sessions in your plan

2. **OpenAI Rate Limits**
   - Implement exponential backoff for retries
   - Consider upgrading your OpenAI plan
   - Reduce the number of parallel requests

3. **Memory Database Issues**

   ```bash
   # Clear the database and start fresh
   rm -rf .voltagent/*.db
   ```

4. **Image Generation Failures**
   - Check DALL-E API quota
   - Verify output directories have write permissions
   - Ensure prompts comply with OpenAI content policy

## 📚 Resources

- **VoltAgent Documentation**: [voltagent.dev/docs](https://voltagent.dev/docs/)
- **BrowserBase Docs**: [docs.browserbase.com](https://docs.browserbase.com)
- **OpenAI API**: [platform.openai.com/docs](https://platform.openai.com/docs)
- **Discord Community**: [Join VoltAgent Discord](https://s.voltagent.dev/discord)
- **Example Projects**: [github.com/VoltAgent/voltagent/tree/main/examples](https://github.com/VoltAgent/voltagent/tree/main/examples)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with [VoltAgent](https://voltagent.dev) - TypeScript framework for AI agents
- Powered by [BrowserBase](https://browserbase.com) - Cloud browser infrastructure
- Image generation by [OpenAI DALL-E 3](https://openai.com/dall-e-3)
- Inspired by the Python browser-use ad generator example

---

<div align="center">
  <p>Built with ❤️ using <a href="https://voltagent.dev">VoltAgent</a> & <a href="https://browserbase.com">BrowserBase</a></p>
</div>
