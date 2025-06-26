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

# VoltAgent with Hugging Face MCP Integration

This example demonstrates how to integrate VoltAgent with Hugging Face's Model Context Protocol (MCP) server, allowing your agent to access and interact with various AI models and services hosted on Hugging Face Spaces.

## Try Example

```bash
npm create voltagent-app@latest -- --example with-hugging-face-mcp
```

## Features

- **Hugging Face MCP Integration:** Configure VoltAgent to connect with Hugging Face's MCP server
- **Access to AI Models:** Connect to various models hosted on Hugging Face Spaces
- **File Handling:** Upload and download files for vision, audio, and other multimodal tasks
- **Simple Authentication:** Use your Hugging Face token for secure access

## Prerequisites

- Node.js (v20 or later recommended)
- pnpm (or npm/yarn)
- An OpenAI API key (or setup for another supported LLM provider)
- A Hugging Face account and API token (sign up at [https://huggingface.co/](https://huggingface.co/))

## Setup

1. **Create Environment File:**
   Create a `.env` file in the project directory:

   ```env
   # .env
   OPENAI_API_KEY=your_openai_api_key_here
   HUGGING_FACE_TOKEN=your_huggingface_token_here
   ```

   Replace the placeholder values with your actual API keys.

2. **Get Your Hugging Face Token:**

   - Visit [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
   - Create a new token with read access
   - Copy the token and add it to your `.env` file

## Running the Agent

Start the agent in development mode:

```bash
pnpm dev
# or npm run dev / yarn dev
```

You should see logs indicating the MCP connection and tool fetching, followed by the standard VoltAgent startup message.

## Interacting with the Agent

1. Open the VoltAgent VoltOps Platform: [`https://console.voltagent.dev`](https://console.voltagent.dev)
2. Find the agent named `Hugging Face MCP Agent`
3. Click on the agent name, then click the chat icon
4. Try sending messages that require interaction with Hugging Face models

The agent will use the Hugging Face MCP tools to perform these actions.

## Understanding the Integration

In the `src/index.ts` file, you'll see how the MCP configuration is set up:

```typescript
const mcpConfig = new MCPConfiguration({
  servers: {
    "hf-mcp-server": {
      url: "https://huggingface.co/mcp",
      requestInit: {
        headers: { Authorization: `Bearer ${process.env.HUGGING_FACE_TOKEN}` },
      },
      type: "http",
    },
  },
});
```

This configuration connects to the Hugging Face MCP server and authenticates using your Hugging Face token.

## Working with Hugging Face Spaces

The Hugging Face MCP server allows you to interact with various AI models hosted on Hugging Face Spaces. Here are some examples of what you can do:

### Image Generation

You can generate images using models like FLUX.1-schnell:

```
Can you generate an image of a mountain landscape?
```

### Text-to-Speech

Convert text to speech using models like StyleTTS2:

```
Can you convert this text to speech: "Hello, this is a test of the text-to-speech system."
```

### Vision Tasks

Analyze images using vision models:

```
What can you tell me about this image? [Upload an image]
```

## Advanced Configuration

For more advanced use cases, you can explore the [mcp-hfspace](https://github.com/evalstate/mcp-hfspace) project, which provides additional configuration options for working with Hugging Face Spaces through MCP.

Some advanced features include:

- Setting up a working directory for file uploads/downloads
- Connecting to specific Hugging Face Spaces
- Using private Spaces with authentication
- Configuring multiple server instances

## Recommended Spaces

Here are some recommended Hugging Face Spaces that work well with MCP:

### Image Generation

- black-forest-labs/FLUX.1-schnell
- shuttleai/shuttle-jaguar

### Text-to-Speech

- styletts2/styletts2

### Vision Models

- Qwen/QVQ-72B-preview

For more information on using these models and others, visit the [Hugging Face Spaces](https://huggingface.co/spaces) directory.
