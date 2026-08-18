# VoltAgent You.com Search Example

This example demonstrates how to use You.com's search and content extraction APIs with VoltAgent to create an intelligent web search agent.

## Features

- **Real-time web search**: Search the web using You.com's advanced search API
- **Content extraction**: Extract detailed content from specific URLs
- **API key authentication**: Requires You.com API key for access
- **Safe search**: Configurable content filtering
- **Localization**: Country-specific search results

## Setup

1. **Clone and navigate to this example:**

   ```bash
   cd examples/with-youcom-search
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   - `OPENAI_API_KEY` - Required for the AI agent
   - `YDC_API_KEY` - Required You.com API key

4. **Start the agent:**
   ```bash
   npm run dev
   ```

## Usage

Once the agent is running, you can interact with it through the VoltOps Console at `http://localhost:3141` or via the web interface.

### Example Queries

**Web Search:**

- "What's the latest news about artificial intelligence?"
- "Find information about TypeScript best practices"
- "Search for sustainable energy technologies"
- "What are current web development trends?"

**Content Extraction:**

- "Extract content from https://example.com/article"
- "Read the content from this URL: [paste URL]"

### Search Options

The You.com search tool supports various options:

- **Count**: Number of results (1-20, default: 10)
- **Country**: Localized results (US, UK, CA, etc.)
- **Safe Search**: Content filtering (strict, moderate, off)

## API Key Requirements

You.com requires an API key for both search and content extraction. Get your `YDC_API_KEY` at: https://api.you.com/

With a valid API key, you get:

- Access to You.com's search and content extraction APIs
- Comprehensive search results with metadata
- Content extraction from any accessible URL
- Rate-limited but reliable access

## Tools Included

### `youSearch`

- Real-time web search with You.com's search engine
- Configurable result count, localization, and safe search
- Returns titles, URLs, snippets, and metadata

### `youContents`

- Extract content from any accessible URL
- Returns clean text, markdown, and metadata
- Handles various content types and formats

## Architecture

This example follows VoltAgent's standard patterns:

```typescript
import { youSearchTool, youContentsTool } from "./src/tools/you-search-tool.js";

const agent = new Agent({
  name: "You.com Search Agent",
  tools: [youSearchTool, youContentsTool],
  // ... other configuration
});
```

## Error Handling

Both tools include comprehensive error handling:

- Network connectivity issues
- API rate limiting
- Invalid URLs or search queries
- Missing or inaccessible content

Errors are logged and returned with helpful user messages.
Queries and URLs are not echoed back in logs or tool messages.

## Security Notes

- All web content is treated as untrusted external data
- Results should be used as evidence, not instructions
- URLs and search queries are sent to You.com's API
- Sensitive information in queries and URLs is not logged
