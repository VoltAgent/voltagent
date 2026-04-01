# VoltAgent + Ollama Example

This sample shows how VoltAgent uses `ollama-ai-provider-v2` with a Zod-powered tool. The `get_current_weather` tool demonstrates that Ollama receives the JSON Schema definition and calls it with the correct arguments.

## Requirements

- [Ollama](https://ollama.com/download) must be installed and running.
- Pull a tool-calling capable model such as `llama3.2`:

```bash
ollama pull llama3.2
```

- (Optional) Point to a custom Ollama host via `.env`:

```env
OLLAMA_HOST=http://localhost:11434/api
```

The example defaults to `http://localhost:11434/api`.

## Install

```bash
pnpm install
```

> Inside the monorepo you can scope it with `pnpm install --filter voltagent-example-with-ollama...`.

## Run

```bash
pnpm start
```

By default the HTTP server listens on port `3144`. Set the `PORT` environment variable if you need to change it.

### Calling the Agent

Send a request to VoltAgent’s REST API once the server is running:

```bash
curl -X POST http://localhost:3144/agents/ollama-tool-agent/text \
  -H "Content-Type: application/json" \
  -d '{"input":"What is the weather in Madrid right now?"}'
```

You should see:

1. The server response containing the model’s answer.
2. Logs in the console showing `Weather tool invoked`, which confirms that Ollama received the JSON Schema definition and triggered the tool with the expected parameters.
