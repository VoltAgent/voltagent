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

## VoltAgent: Build AI Agents Fast and Flexibly

VoltAgent is an open-source TypeScript framework for creating and managing AI agents. It provides modular components to build, customize, and scale agents with ease. From connecting to APIs and memory management to supporting multiple LLMs, VoltAgent simplifies the process of creating sophisticated AI systems. It enables fast development, maintains clean code, and offers flexibility to switch between models and tools without vendor lock-in.

## Try Example

```bash
npx create-voltagent-app@latest -- --example with-google-drive-mcp
```

## Setup

### Navigate to the project directory

```bash
cd with-google-drive-mcp
```

### Install dependencies

Install dependencies for both server and client:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
cd .. # Go back to the root project directory
```

### Set up environment variables

Create a `.env` file in the `server` directory (`server/.env`). Add the following variables:

```env
# Obtain your API key from Composio
COMPOSIO_API_KEY="your_composio_api_key"

# Obtain your Google Drive Integration ID from Composio (https://app.composio.dev/app/googledrive)
GOOGLE_INTEGRATION_ID="your_google_integration_id"

# Optional: Specify the frontend URL if it's different from the default
# FRONTEND_URL="http://localhost:5173"
```

- Replace `"your_composio_api_key"` and `"your_google_integration_id"` with your actual credentials from [Composio](https://app.composio.dev/).
- The `FRONTEND_URL` is optional and defaults to `http://localhost:5173` if not provided.

### Run the application

- **Start the server:**

  ```bash
  cd server
  npm run dev
  ```

  The server will start on `http://localhost:3000`.

- **Start the client (in a separate terminal):**
  ```bash
  cd client
  npm run dev
  ```
  The client will open in your browser, likely at `http://localhost:5173`.

Now you can interact with the application, log in using your Google account via Composio, and use the agent to search your Google Drive.
