<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
</a>

<br/>
<br/>

<div align="center">
    <a href="https://voltagent.dev">Home Page</a> |
    <a href="https://voltagent.dev/docs/">Documentation</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a> |
    <a href="https://s.voltagent.dev/discord">Discord</a> |
    <a href="https://voltagent.dev/blog/">Blog</a>
</div>
</div>

<br/>

<div align="center">
    <strong>VoltAgent is an open source TypeScript framework for building and orchestrating AI agents.</strong><br>
Escape the limitations of no-code builders and the complexity of starting from scratch.
    <br />
    <br />
</div>

<div align="center">

[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)

</div>

<br/>

<div align="center">
<a href="https://voltagent.dev/">
<img width="896" alt="VoltAgent Schema" src="https://github.com/user-attachments/assets/f0627868-6153-4f63-ba7f-bdfcc5dd603d" />
</a>

</div>

## VoltAgent + Zapier MCP Example

This example demonstrates how to integrate VoltAgent with a Zapier Model Context Protocol (MCP) server, allowing your agent to access and interact with various third-party services through Zapier's unified interface.

## Features

- **Zapier MCP Integration:** Shows how to configure `MCPConfiguration` for an HTTP-based Zapier MCP server.
- **Third-Party Service Access:** Connect to services available via Zapier.
- **Customizable Permissions:** Specify exactly which actions and data your agent can access via Zapier MCP.

## Prerequisites

- Node.js (v20 or later recommended)
- pnpm (or npm/yarn)
- AWS credentials for Amazon Bedrock (see below) or you can use OpenAI
- A Zapier MCP account (see [Zapier documentation](https://zapier.com/mcp/))

## Using OpenAI

If you prefer to use OpenAI instead of Amazon Bedrock, update `src/index.ts` to use a model string and set `OPENAI_API_KEY`:

```ts
const agent = new Agent({
  // ...
  model: "openai/gpt-4o-mini",
});
```

## Setup

1. **Create Environment File:**
   Create a `.env` file in the `examples/with-zapier-mcp` directory:

   ```env
   # .env
   ZAPIER_MCP_URL=https://your-zapier-mcp-server-url
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=us-east-1
   AWS_SESSION_TOKEN=your_aws_session_token  # Optional, if using temporary credentials
   ```

   Replace the values with your actual Zapier MCP URL and AWS credentials.

2. **Get Your Zapier MCP URL:**
   - Set up a Zapier MCP server as described in the [Zapier MCP documentation](https://zapier.com/mcp).
   - Copy the MCP server URL for use in your `.env` file.

3. **Install Dependencies:**

   ```bash
   pnpm install
   # or npm install / yarn install
   ```

## Running the Agent

Start the agent in development mode:

```bash
pnpm dev
# or npm run dev / yarn dev
```

You should see logs indicating the Zapier MCP connection and tool fetching, followed by the standard VoltAgent startup message.

## Interacting with the Agent

1. Open the VoltOps LLM Observability platform: [`https://console.voltagent.dev`](https://console.voltagent.dev)
2. Find the agent named `Zapier MCP Agent`
3. Click on the agent name, then click the chat icon
4. Try sending messages that require interaction with the connected Zapier services

The agent will use the Zapier MCP tools to perform these actions.

## Customizing the Integration

To use your own Zapier MCP server, update the `ZAPIER_MCP_URL` in your `.env` file with the URL from your Zapier MCP dashboard. This ensures your agent connects to your specific MCP server with the permissions and services you've configured.
