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
npm create voltagent-app@latest -- --example with-amazon-bedrock
```

## Getting Started

### Prerequisites

- Node.js (v20 or newer)
- npm, yarn, or pnpm
- AWS Account with Amazon Bedrock access
- AWS credentials configured

### Installation

1. Create a new VoltAgent app with Amazon Bedrock example:

```bash
npm create voltagent-app@latest -- --example with-amazon-bedrock
```

2. Navigate to the project directory:

```bash
cd with-amazon-bedrock
```

3. Configure AWS credentials:

```bash
cp .env.example .env
```

Edit `.env` with your AWS credentials:

```env
AWS_REGION=us-east-1

# Option 1: AWS Access Keys
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# Option 2: AWS Profile (recommended)
AWS_PROFILE=your-profile-name
```

### Enable Bedrock Models

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to Amazon Bedrock → Model access
3. Request access to models (e.g., Claude, Llama, Titan)
4. Wait for approval (usually instant)

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

## Features

This example demonstrates:

- **Amazon Bedrock Integration** - Access to Claude, Llama, Mistral, and Titan models
- **AWS Credential Chain** - Automatic credential detection (env vars, profiles, IAM roles)
- **Model Router** - Use `amazon-bedrock/<model>` strings with VoltAgent
- **Custom Tools** - Weather tool example for function calling
- **Server Mode** - REST API server on port 4000

## Configuration

### Available Models

The example uses Claude 3.5 Sonnet by default. You can change it in `src/index.ts`:

```typescript
// Claude models
model: "amazon-bedrock/anthropic.claude-3-5-sonnet-20240620-v1:0";
model: "amazon-bedrock/anthropic.claude-3-opus-20240229-v1:0";

// Llama models
model: "amazon-bedrock/meta.llama3-2-3b-instruct-v1:0";
model: "amazon-bedrock/meta.llama3-1-70b-instruct-v1:0";

// Mistral models
model: "amazon-bedrock/mistral.mistral-large-2407-v1:0";

// Titan models
model: "amazon-bedrock/amazon.titan-text-premier-v1:0";
```

See [Bedrock documentation](https://docs.aws.amazon.com/bedrock/) for all available models.

### AWS Authentication

VoltAgent reads Amazon Bedrock credentials from the standard AWS environment variables:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_SESSION_TOKEN` (optional, for temporary credentials)

If you already have AWS profiles or IAM roles configured locally, they are picked up automatically by the provider.

## Project Structure

```
.
├── src/
│   └── index.ts       # Main application with Bedrock agent
├── .env.example       # AWS configuration template
├── .voltagent/        # Auto-generated folder for agent memory
├── package.json
├── tsconfig.json
└── README.md
```

## Troubleshooting

### Access Denied

- Ensure model access is enabled in Bedrock console
- Verify IAM permissions include Bedrock access

### Region Issues

- Check AWS_REGION matches where Bedrock and your models are available

### Rate Limits

- Be aware of Bedrock quotas for your account
- Consider implementing retry logic for production

## Learn More

- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Vercel AI SDK - Amazon Bedrock](https://sdk.vercel.ai/providers/ai-sdk-providers/amazon-bedrock)
- [VoltAgent Documentation](https://voltagent.dev/docs)

## License

MIT
