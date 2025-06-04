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
    <strong>VoltAgent Custom Endpoints Example</strong><br>
Learn how to extend the VoltAgent API server with your own custom REST endpoints.
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

## VoltAgent Custom Endpoints: Extend Your API Server

This example shows how to create custom API endpoints with VoltAgent using **two different registration methods**. You can extend the built-in VoltAgent API server with your own business logic, data endpoints, or integration points.

## Try Example

```bash
npm create voltagent-app@latest -- --example with-custom-endpoints
```

## Features

This example includes 4 simple endpoints:

- `GET /api/health` - Health check (registered via function call)
- `GET /api/hello/:name` - Personalized greeting (registered via function call)
- `POST /api/calculate` - Simple calculator (registered via constructor)
- `DELETE /api/delete-all` - Delete all data (registered via constructor)

## Registration Methods

### Method 1: Function Call Registration

```typescript
registerCustomEndpoints(endpoints);
```

- Useful when you want to register endpoints before creating VoltAgent
- Good for conditional endpoint registration
- Can be called multiple times

### Method 2: Constructor Registration

```typescript
new VoltAgent({
  agents: { agent },
  customEndpoints: endpoints,
});
```

- Most common and convenient method
- Register endpoints when creating VoltAgent instance

### Using Both Methods

Both methods work together! You can use them simultaneously and all endpoints will be properly registered and displayed in the server startup banner.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file:

```bash
echo "OPENAI_API_KEY=your_api_key_here" > .env
```

## Running

```bash
npm run dev
```

## Testing

```bash
# Health check
curl http://localhost:3141/api/health

# Greeting
curl http://localhost:3141/api/hello/john

# Calculator
curl -X POST http://localhost:3141/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"a": 10, "b": 5, "operation": "add"}'

# Delete all data
curl -X DELETE http://localhost:3141/api/delete-all
```

## Chat with Agent

```bash
curl -X POST http://localhost:3141/agents/agent/text \
  -H "Content-Type: application/json" \
  -d '{"input": "What endpoints are available?"}'
```

## How it Works

1. **Method 1**: Use `registerCustomEndpoints(endpoints)` to register endpoints via function call
2. **Method 2**: Pass `customEndpoints` array to VoltAgent constructor
3. Both methods can be used together - all endpoints will be registered
4. Each endpoint contains a `path`, `method`, and `handler`
5. The handler function receives the HTTP request and returns a response

That's it! 🎉
