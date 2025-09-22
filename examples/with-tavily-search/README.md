# VoltAgent with Tavily Search

This example demonstrates how to integrate Tavily's advanced web search API with VoltAgent to create an AI agent capable of real-time web search and content extraction.

## Features

- **Web Search**: Search the web for real-time information using Tavily's advanced search API
- **Content Extraction**: Extract detailed content from specific URLs
- **AI-Powered Answers**: Get comprehensive answers based on current web data
- **Flexible Search Options**: Configure search depth, domains, and result limits

## Prerequisites

1. **Tavily API Key**: Get your API key from [Tavily](https://tavily.com/)
2. **OpenAI API Key**: For the AI model integration

## Setup

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Configure environment variables**:
   Copy the example environment file and add your API keys:

   ```bash
   cp .env.example .env
   ```

   Then edit the `.env` file with your actual API keys:

   ```env
   OPENAI_API_KEY=your_actual_openai_api_key
   TAVILY_API_KEY=your_actual_tavily_api_key
   ```

3. **Run the example**:
   ```bash
   pnpm dev
   ```

## Usage

The agent will be available at `http://localhost:3141` and can handle various types of queries:

### Web Search Examples

- "What's the latest news about AI?"
- "Find information about climate change"
- "Search for the best restaurants in Paris"
- "What's the current weather in New York?"

### Content Extraction Examples

- "Extract content from this URL: https://example.com/article"
- "Get the full text from this news article: [URL]"

## Tools Available

### 1. Tavily Search Tool

- **Purpose**: Search the web for real-time information
- **Parameters**:
  - `query`: Search query string
  - `numResults`: Number of results to return (default: 5, max: 10)
  - `searchDepth`: "basic" or "advanced" (default: "basic")
  - `includeDomains`: Specific domains to search
  - `excludeDomains`: Domains to exclude
  - `maxResults`: Maximum number of results

### 2. Tavily Extract Tool

- **Purpose**: Extract content from specific URLs
- **Parameters**:
  - `url`: URL to extract content from
  - `includeRawContent`: Include raw HTML content (default: false)

## Example Queries

Try these example queries with the agent:

1. **Current Events**: "What are the latest developments in artificial intelligence?"
2. **Research**: "Find recent studies about renewable energy"
3. **Local Information**: "What are the best restaurants in San Francisco?"
4. **Technical Information**: "What's the current status of TypeScript 5.0?"
5. **Content Analysis**: "Extract and summarize this article: [URL]"

## Configuration

The agent is configured with:

- **Model**: GPT-4o-mini for cost-effective processing
- **Port**: 3141 (configurable)
- **Logging**: Pino logger with info level
- **Tools**: Tavily search and extract tools

## API Integration

This example uses:

- **Tavily API**: For web search and content extraction
- **OpenAI API**: For AI model processing
- **VoltAgent**: For agent orchestration and tool management

## Error Handling

The tools include comprehensive error handling for:

- Missing API keys
- Network errors
- API rate limits
- Invalid URLs
- Empty search results

## Development

To modify or extend this example:

1. **Add new tools**: Create additional tools in `src/tools.ts`
2. **Modify agent behavior**: Update the agent instructions in `src/index.ts`
3. **Add new features**: Extend the agent with additional capabilities

## Troubleshooting

- **API Key Issues**: Ensure both `OPENAI_API_KEY` and `TAVILY_API_KEY` are set
- **Network Errors**: Check your internet connection and API endpoints
- **Rate Limits**: Tavily has usage limits; check your account status
- **Port Conflicts**: Change the port in the server configuration if needed
