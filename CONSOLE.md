# VoltAgent Developer Console

<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
</a>
</div>
<br/>
The VoltAgent Developer Console is a web-based tool designed to help you monitor, debug, and improve your AI agents during development and execution.

<br />
<br />

Access the hosted Developer Console at: [https://console.voltagent.dev](https://console.voltagent.dev/)

[![VoltAgent Console](https://github.com/user-attachments/assets/0adbec33-1373-4cf4-b67d-825f7baf1cb4)](https://console.voltagent.dev/)

You can also try a live interactive demo here: [https://console.voltagent.dev/demo](https://console.voltagent.dev/demo)

## How it Works

When you run a VoltAgent application locally with observability enabled, it exposes a local server (typically on port `3141`). The Developer Console connects directly to this local server via your browser.

- **Local Connection:** Communication happens directly between the console in your browser and your local agent process. No data is sent to external servers.
- **Real-time Data:** Observe agent activities as they happen.

## Key Features

The console provides several views and features to enhance observability:

### 1. Real-Time Agent Visualization

- **What:** Visualize and debug your AI agent's execution flow in real-time.
- **Includes:** A visual representation (timeline or graph) of the agent's steps, function calls, and tool usage.

![Real-Time Agent Visualization](https://github.com/user-attachments/assets/736879b9-f2d1-4990-8b57-9038660dc77a)

### 2. Agent Chat

- **What:** Chat with your AI agents in real-time.
- **Includes:** Metrics and insights alongside the chat interface.

![AI Agent Chat Playground](https://github.com/user-attachments/assets/d29892bd-b0e2-4352-95f8-f58b79d0f57e)

### 3. Granular Visibility into Agent Runs

- **What:** View detailed inputs, outputs, and parameters for each agent, memory, and tool call.
- **Includes:** Ability to inspect messages (prompts, responses), internal logs, and tool details for specific steps.

![AI Agent Granular Visibility](https://github.com/user-attachments/assets/051f0289-d33a-46ba-9029-f62615276543)

### 4. Agent List View

- **What:** Displays a list of active or recent agent sessions.
- **Includes:** Quick overview of agents that have run or are currently running.

![agent-list](https://github.com/user-attachments/assets/bfb3d85f-6584-4271-8f4f-05aaad9dff7a)

## Getting Started

### Create & Run Your VoltAgent Application

- First, create a new project if you haven't already using the quick start command:
  ```bash
  npm create voltagent-app@latest my-agent-app
  cd my-agent-app
  ```
  _(The `create-voltagent-app` tool will typically prompt you for necessary API keys and create a `.env` file for you. If you need to add keys manually later, create or edit the `.env` file in your project root, e.g., `OPENAI_API_KEY=your_key`)_
- Then, run your VoltAgent application locally. When you run the `dev` command (e.g., `npm run dev`), you should see the VoltAgent server startup message in your terminal:

  ```bash
  ══════════════════════════════════════════════════
    VOLTAGENT SERVER STARTED SUCCESSFULLY
  ══════════════════════════════════════════════════
    ✓ HTTP Server: http://localhost:3141

    Developer Console:    https://console.voltagent.dev
  ══════════════════════════════════════════════════
  [VoltAgent] All packages are up to date
  ```

### Open the Console

Click the [`https://console.voltagent.dev`](https://console.voltagent.dev) link shown in your terminal output (or copy-paste it into your browser).

### Connect to Local Agent

The console should automatically attempt to connect to `http://localhost:3141`. If your agent is running on a different port, you might need to configure the connection URL in the console's settings (usually via a connection status indicator or settings menu).

### Explore

Once connected, you can:

- See your running agent(s) in the **Agent List View**.
- Click an agent to view its execution details (steps, function calls, etc.) in the **Agent Detail View**.
- Inspect the flow visually in the **Real-Time Agent Visualization**.
- Interact with your agent using the **Agent Chat** feature.
