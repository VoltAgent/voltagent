# VoltAgent Feedback Templates

This example shows how to configure different feedback templates per agent so the Console can render thumbs, numeric sliders, and categorical options.

## Agents

- `thumbs` - boolean satisfaction signal (thumbs up/down)
- `rating` - continuous 1-5 rating slider
- `issues` - categorical issue type selection

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy the env file and set your keys:

```bash
cp .env.example .env
```

Update `OPENAI_API_KEY`, `VOLTAGENT_PUBLIC_KEY`, and `VOLTAGENT_SECRET_KEY` in `.env`.

3. Start the server:

```bash
pnpm dev
```

The server runs on `http://localhost:3141` by default.

## Usage

Send a message to any agent:

```bash
curl -X POST http://localhost:3141/agents/thumbs/chat \
  -H "Content-Type: application/json" \
  -d '{"input":"Give me a quick summary of VoltAgent."}'
```

```bash
curl -X POST http://localhost:3141/agents/rating/chat \
  -H "Content-Type: application/json" \
  -d '{"input":"Explain vector search in two sentences."}'
```

```bash
curl -X POST http://localhost:3141/agents/issues/chat \
  -H "Content-Type: application/json" \
  -d '{"input":"Draft a short welcome email."}'
```

Open the Console Observability Playground to test the feedback UI on each agent response.
