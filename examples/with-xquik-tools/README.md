# VoltAgent with Xquik Tools

This example shows how to add Xquik REST API tools to a VoltAgent research agent for public X/Twitter data.

## Features

- Search public posts with X query operators
- Look up posts by ID with author, metrics, and media
- Look up public user profiles by username or ID
- Fetch recent public posts from a user
- Retrieve public X/Twitter trends by WOEID region

## Prerequisites

1. **Xquik API Key**: Create an API key from the [Xquik dashboard](https://dashboard.xquik.com)
2. **OpenAI API Key**: Used by the example agent model

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env`:

   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   XQUIK_API_KEY=your_xquik_api_key_here
   XQUIK_BASE_URL=https://xquik.com/api/v1
   ```

3. Run the example:

   ```bash
   pnpm dev
   ```

The agent runs on the default VoltAgent server port and exposes one agent named `xquikResearchAgent`.

## Tools Available

### 1. Search X Posts

- **Purpose**: Search public X/Twitter posts with X query operators
- **Endpoint**: `GET /x/tweets/search`
- **Parameters**:
  - `query`: Search query string
  - `queryType`: `Latest` or `Top`
  - `limit`: Maximum posts to return
  - `cursor`: Optional pagination cursor
  - `sinceTime`, `untilTime`: Optional ISO 8601 time bounds

### 2. Get X Post

- **Purpose**: Look up a public post by ID
- **Endpoint**: `GET /x/tweets/{id}`

### 3. Get X User

- **Purpose**: Look up a public user profile by username or ID
- **Endpoint**: `GET /x/users/{id}`

### 4. Get X User Posts

- **Purpose**: Fetch recent public posts from a user
- **Endpoint**: `GET /x/users/{id}/tweets`
- **Parameters**:
  - `user`: Username without `@`, or numeric user ID
  - `cursor`: Optional pagination cursor
  - `includeReplies`: Include replies
  - `includeParentTweet`: Include parent posts for replies

### 5. Get X Trends

- **Purpose**: Fetch public trends by WOEID region
- **Endpoint**: `GET /x/trends`
- **Parameters**:
  - `woeid`: Region WOEID, with `1` for worldwide
  - `count`: Number of trends to return

## Example Queries

- "Search recent posts about AI agent frameworks and summarize the top themes."
- "Look up @voltagent_dev and summarize recent public posts."
- "Find worldwide X trends and explain which ones relate to developer tools."
- "Get this post by ID and extract the author, timestamp, and engagement metrics."

## API Integration

This example uses the Xquik public REST API with the `x-api-key` header and the `xquik-api-contract` header set to `2026-04-29`.

See the [Xquik API reference](https://docs.xquik.com/api-reference/overview) for endpoint details.

## Troubleshooting

- **Missing API key**: Set `XQUIK_API_KEY` in `.env`.
- **Authentication errors**: Create a fresh API key from the Xquik dashboard.
- **Empty results**: Try a broader query, switch between `Latest` and `Top`, or remove time bounds.
- **Regional trends**: Use WOEID `1` for worldwide, `23424977` for the US, or another supported region.
