# VoltAgent with Firecrawl Search

This example shows how to give a VoltAgent agent web search and page reading with Firecrawl. [Firecrawl search](https://www.firecrawl.dev/search?utm_source=voltagent&utm_medium=integration) returns web results and can include each page's content as Markdown in the same call. A second tool fetches any URL as Markdown.

## Features

- **Web Search**: Find current pages on any topic, with titles, URLs and descriptions
- **Page Content in Search**: Optionally get each result's page content as Markdown in the same call
- **Page Reading**: Fetch any URL as clean Markdown
- **Cited Answers**: The agent searches first, reads the most relevant pages when needed, and cites the URLs it used

## Prerequisites

1. **Firecrawl API Key**: Get your API key from the [Firecrawl dashboard](https://www.firecrawl.dev/signin?utm_source=voltagent&utm_medium=integration&redirect=%2Fapp%2Fapi-keys)
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
   FIRECRAWL_API_KEY=your_actual_firecrawl_api_key
   ```

3. **Run the example**:
   ```bash
   pnpm dev
   ```

## Usage

The agent will be available at `http://localhost:3141`. Try queries like:

- "What changed in the latest Node.js LTS release?"
- "Find the VoltAgent docs page about tools and summarize how to create one."
- "Read https://voltagent.dev/docs/ and list the main sections."

## Tools Available

### 1. Firecrawl Search Tool

- **Purpose**: Search the web, optionally with page content
- **Endpoint**: `POST https://api.firecrawl.dev/v2/search`
- **Parameters**:
  - `query`: Search query string
  - `limit`: Number of results to return (default: 5, max: 10)
  - `scrapeContent`: Include each result's page content as Markdown (default: false)

### 2. Firecrawl Scrape Tool

- **Purpose**: Fetch a single URL as Markdown
- **Endpoint**: `POST https://api.firecrawl.dev/v2/scrape`
- **Parameters**:
  - `url`: URL of the page to fetch
  - `onlyMainContent`: Drop navigation, headers and footers (default: true)

Page content is truncated so it fits in the model's context: 5,000 characters per search result and 20,000 characters for a scraped page. You can adjust both limits with `MAX_SEARCH_MARKDOWN_LENGTH` and `MAX_SCRAPE_MARKDOWN_LENGTH` in `src/tools.ts`. Returning page content with search uses more Firecrawl credits per result.

See the [Firecrawl search docs](https://docs.firecrawl.dev/features/search?utm_source=voltagent&utm_medium=integration) for more options, such as `sources`, `location` and `tbs`.

## Configuration

The agent is configured with:

- **Model**: GPT-4o-mini
- **Port**: 3141 (configurable)
- **Logging**: Pino logger with info level
- **Memory**: LibSQL
- **Tools**: Firecrawl search and scrape tools

## Troubleshooting

- **API Key Issues**: Ensure both `OPENAI_API_KEY` and `FIRECRAWL_API_KEY` are set
- **401 errors from Firecrawl**: Check that the key in `.env` is correct and active
- **402 or 429 errors from Firecrawl**: Your account is out of credits or over its rate limit; check your usage in the Firecrawl dashboard
- **Port Conflicts**: Change the port in the server configuration if needed
