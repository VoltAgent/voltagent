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
<img width="896" alt="flow" src="https://github.com/user-attachments/assets/f0627868-6153-4f63-ba7f-bdfcc5dd603d" />
</a>

</div>

<br/>

## Quick Setup

The easiest way to set up VoltAgent MCP Docs Server is through the VoltAgent CLI:

```bash
# For existing projects
volt mcp setup

# For new projects (automatically configures MCP)
npm create voltagent-app@latest
```

This interactive command will:

- Create the appropriate configuration files
- Guide you through the setup process

For detailed setup instructions and troubleshooting, see the [complete documentation](http://voltagent.dev/docs/getting-started/mcp-docs-server/).

## Manual Setup

### Using with Cursor

1. Open Cursor settings (`Cmd/Ctrl + ,`)
2. Navigate to "Features" > "Model Context Protocol"
3. Add a new MCP server:

```json
{
  "name": "voltagent",
  "command": "npx",
  "args": ["-y", "@voltagent/docs-mcp"]
}
```

Alternatively, if you've built locally:

```json
{
  "name": "voltagent",
  "command": "node",
  "args": ["path/to/voltagent/packages/docs-mcp/dist/server.js"]
}
```

### Using with Windsurf

1. Open Windsurf settings (`Cmd/Ctrl + ,`)
2. Navigate to "Extensions" > "Model Context Protocol" or search for "MCP" in settings
3. Add a new MCP server configuration:

```json
{
  "name": "voltagent",
  "command": "npx",
  "args": ["-y", "@voltagent/docs-mcp"]
}
```

Or if you prefer to use the locally built version:

```json
{
  "name": "voltagent",
  "command": "node",
  "args": ["path/to/voltagent/packages/docs-mcp/dist/server.js"]
}
```

### Using with VS Code

1. Install the MCP extension for VS Code (if available) or use the Claude extension that supports MCP
2. Open VS Code settings (`Cmd/Ctrl + ,`)
3. Search for "MCP" or "Model Context Protocol"
4. Add the server configuration:

```json
{
  "name": "voltagent",
  "command": "npx",
  "args": ["-y", "@voltagent/docs-mcp"],
  "type": "stdio"
}
```

### Available Tools

The MCP server provides the following tools:

1. **search_voltagent_docs**: Search VoltAgent documentation

   - `query`: Search term or keyword
   - `section`: Specific documentation section (optional)

2. **get_voltagent_doc**: Get specific documentation file

   - `filepath`: Path to the documentation file

3. **list_voltagent_docs**: List documentation structure

   - `section`: Specific section to list (optional)

4. **search_voltagent_examples**: Search VoltAgent examples

   - `query`: Search term
   - `technology`: Technology filter (optional)

5. **get_voltagent_example**: Get specific example content

   - `exampleName`: Name of the example

6. **list_voltagent_examples**: List available examples

   - `category`: Category filter (optional)

7. **list_voltagent_changelogs**: List package changelogs

   - No parameters required

8. **get_voltagent_changelog**: Get specific package changelog

   - `packageName`: Package name (e.g., 'core', 'cli', 'voice')
   - `maxEntries`: Maximum number of changelog entries (optional)

9. **search_voltagent_changelogs**: Search across all changelogs
   - `query`: Search term to find in changelogs
   - `packages`: Specific packages to search (optional)

## Features

- **Documentation Search**: Search through VoltAgent documentation by keywords
- **Specific Documentation Access**: Read specific documentation files
- **Documentation Structure Listing**: View all available documentation files
- **Example Search**: Search through VoltAgent examples
- **Example Content Access**: View code and files from specific examples
- **Example Listing**: List all available examples by category
- **Changelog Access**: Browse package changelogs for bug fixes and updates
- **Changelog Search**: Search across all package changelogs for specific issues

## Example Usage

After setting up the MCP server in your preferred editor (Cursor, Windsurf, VS Code, or Claude Desktop), you can ask questions like:

- "How do I create an agent in VoltAgent?"
- "How do I use the voice features?"
- "Do you have a Next.js example with VoltAgent?"
- "How do I set up an MCP server?"
- "How do I integrate with Supabase?"
- "What bug fixes are in the latest core package?"
- "Show me recent changes to the voice package"

The MCP server will automatically find and present the relevant documentation, examples, and changelog information.

## What is VoltAgent?

> An **AI Agent Framework** provides the foundational structure and tools needed to build applications powered by autonomous agents. These agents, often driven by Large Language Models (LLMs), can perceive their environment, make decisions, and take actions to achieve specific goals. Building such agents from scratch involves managing complex interactions with LLMs, handling state, connecting to external tools and data, and orchestrating workflows.

**VoltAgent** is an open-source TypeScript framework that acts as this essential toolkit. It simplifies the development of AI agent applications by providing modular building blocks, standardized patterns, and abstractions. Whether you're creating chatbots, virtual assistants, automated workflows, or complex multi-agent systems, VoltAgent handles the underlying complexity, allowing you to focus on defining your agents' capabilities and logic.

## Learning VoltAgent

- **[Documentation](https://voltagent.dev/docs/)**: Dive into guides, concepts, and tutorials.
- **[Examples](https://github.com/voltagent/voltagent/tree/main/examples)**: Explore practical implementations.
- **[Blog](https://voltagent.dev/blog/)**: Read more about technical insights, and best practices.

## Contribution

We welcome contributions! Please refer to the contribution guidelines. Join our [Discord](https://s.voltagent.dev/discord) server for questions and discussions.

## Community ♥️ Thanks

Your stars help us reach more developers! If you find VoltAgent useful, please consider giving us a star on GitHub to support the project and help others discover it.

## License

Licensed under the MIT License, Copyright © 2025-present VoltAgent.
