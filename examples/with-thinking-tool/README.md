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
    <strong>VoltAgent Example: Using Reasoning Tools (`think` & `analyze`)</strong><br>
This example demonstrates how to equip a VoltAgent with `think` and `analyze` tools to enable step-by-step reasoning and analysis during task execution.
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

## VoltAgent: With Thinking Tools Example

This example showcases how to integrate the `think` and `analyze` tools from `@voltagent/core` into an agent. These tools allow the agent to perform structured reasoning:

- **`think`**: Acts as a scratchpad for the agent to break down problems, plan steps, and explain its reasoning before taking action.
- **`analyze`**: Allows the agent to evaluate the results of its actions or thoughts and decide on the next step (continue, validate, or provide a final answer).

By using these tools, agents can tackle more complex tasks, exhibit clearer thought processes, and potentially improve their accuracy and reliability.

This example sets up a basic agent, includes the reasoning tools, and logs the reasoning steps emitted by the agent during its interaction.

## Setup

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone https://github.com/voltagent/voltagent.git
    cd voltagent/examples/with-thinking-tool
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up environment variables:**
    Create a `.env` file in this directory (`examples/with-thinking-tool`) and add your OpenAI API key:
    ```env
    OPENAI_API_KEY=your_openai_api_key_here
    ```

## Run the Example

```bash
npm run dev
```

Observe the console output. You should see the agent's final response as well as the `ReasoningStep` objects logged whenever the agent uses the `think` or `analyze` tools.
