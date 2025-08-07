# Amazon Bedrock Example

This example demonstrates how to use VoltAgent with Amazon Bedrock through the Vercel AI SDK.

## Prerequisites

1. AWS Account with Amazon Bedrock access
2. Bedrock models enabled in your AWS region
3. AWS credentials configured

## Setup

### 1. Enable Bedrock Models

First, ensure you have access to Amazon Bedrock models in your AWS account:

1. Go to the AWS Console
2. Navigate to Amazon Bedrock
3. Go to "Model access" in the left menu
4. Request access to the models you want to use (e.g., Claude, Llama, Titan)
5. Wait for approval (usually instant for most models)

### 2. Configure AWS Credentials

The example uses AWS SDK Credentials Chain, which automatically checks for credentials in the following order:

1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. AWS profiles (via `AWS_PROFILE` environment variable)
3. Instance profiles, instance roles, ECS roles, EKS Service Accounts, etc.

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

#### Option 1: Using IAM Access Key and Secret Key

```env
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
```

#### Option 2: Using AWS Profile (Recommended for Local Development)

First configure your AWS profile:

```bash
aws configure --profile your-profile-name
```

Then set the profile in your `.env`:

```env
AWS_PROFILE=your-profile-name
AWS_REGION=us-east-1
```

#### Option 3: Using IAM Roles (AWS Infrastructure)

When running on AWS (EC2, Lambda, ECS, etc.), credentials are automatically obtained from the IAM role. Just set the region:

```env
AWS_REGION=us-east-1
```

### 3. Install Dependencies

```bash
pnpm install
```

## Running the Example

### Development Mode

```bash
pnpm dev
```

### Production Mode

```bash
pnpm build
pnpm start
```

## Available Models

The example is configured to use Claude 3.5 Sonnet by default, but you can use any model available in Amazon Bedrock:

### Anthropic Claude Models

- `anthropic.claude-3-5-sonnet-20240620-v1:0` (default)
- `anthropic.claude-3-5-haiku-20241022-v1:0`
- `anthropic.claude-3-opus-20240229-v1:0`
- `anthropic.claude-3-sonnet-20240229-v1:0`
- `anthropic.claude-3-haiku-20240307-v1:0`

### Meta Llama Models

- `meta.llama3-2-1b-instruct-v1:0`
- `meta.llama3-2-3b-instruct-v1:0`
- `meta.llama3-1-8b-instruct-v1:0`
- `meta.llama3-1-70b-instruct-v1:0`

### Mistral Models

- `mistral.mistral-large-2407-v1:0`
- `mistral.mistral-small-2402-v1:0`

### Amazon Titan Models

- `amazon.titan-text-premier-v1:0`
- `amazon.titan-text-express-v1`
- `amazon.titan-text-lite-v1`

## Features

This example includes:

- **Weather Tool**: Get current weather for any location
- **Logging**: Structured logging with Pino

## Customization

### Changing the Model

To use a different model, modify the `model` parameter in `src/index.ts`:

```typescript
model: bedrock("anthropic.claude-3-5-sonnet-20240620-v1:0"),
```

### Using Direct Credentials Instead of Credential Chain

If you prefer to use direct credentials instead of the credential provider chain, modify the Bedrock provider configuration:

```typescript
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";

const bedrock = createAmazonBedrock({
  region: "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN, // optional
});
```

To add more tools, create new tool definitions and add them to the agent's tools array.

## Troubleshooting

### Model Access Denied

If you get an access denied error, ensure:

1. Your AWS credentials are properly configured
2. The model is enabled in your AWS Bedrock console
3. Your IAM user/role has the necessary Bedrock permissions

### Region Issues

Make sure the AWS_REGION in your .env file matches a region where:

1. Amazon Bedrock is available
2. The specific model you're using is available

### Rate Limits

Be aware of Bedrock's rate limits and quotas for your account. Consider implementing retry logic for production use.

## Learn More

- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Vercel AI SDK - Amazon Bedrock Provider](https://sdk.vercel.ai/providers/ai-sdk-providers/amazon-bedrock)
- [VoltAgent Documentation](https://voltagent.ai)
