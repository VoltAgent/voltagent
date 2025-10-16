# VoltAgent AWS Lambda Deployment Example

This example shows how to deploy a VoltAgent agent to AWS Lambda using Amazon Bedrock with three different deployment tools: AWS SAM, AWS CDK, and Serverless Framework.

## Features

- ⚙️ Runs on AWS Lambda with Node.js 20 runtime
- 🤖 Uses Amazon Bedrock for AI model inference
- 🧰 Includes a sample weather tool
- 🛠️ Three deployment options: SAM, CDK, and Serverless Framework
- 🔗 Full VoltAgent HTTP API available through API Gateway
- 🔐 Automatic IAM permissions for Bedrock access

## Prerequisites

- Node.js 18+
- AWS CLI configured with appropriate permissions
- Access to Amazon Bedrock models in your AWS account
- VoltOps keys (optional for observability)
- Choose one deployment tool:
  - **AWS SAM**: Install [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
  - **AWS CDK**: Install with `npm install -g aws-cdk`
  - **Serverless Framework**: Install with `npm install -g serverless`

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file and add your values:

   ```bash
   cp example.env .env
   ```

   Note: For Lambda deployment, AWS credentials are provided automatically via IAM roles. The `.env` file is only needed for local development.

3. Build the TypeScript code:

   ```bash
   npm run build
   ```

## Deployment Options

### Option 1: AWS SAM

AWS SAM provides a simple way to deploy serverless applications with CloudFormation.

#### Deploy with SAM

```bash
# Build and deploy
npm run deploy:sam

# Or step by step:
npm run build:sam
sam deploy --guided
```

The `--guided` flag walks you through the deployment configuration on first run.

#### Local development with SAM

```bash
# Start local API
npm run dev:sam

# Test locally
curl http://localhost:3000/agents
```

### Option 2: AWS CDK

AWS CDK provides infrastructure as code with TypeScript.

#### Deploy with CDK

```bash
# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy
npm run deploy:cdk

# Optional: include VoltOps keys
npm run deploy:cdk -- \
  --context voltAgentPublicKey=pk-your-key-here \
  --context voltAgentSecretKey=sk-your-key-here
```

#### CDK development

```bash
# Synthesize CloudFormation template
npm run build:cdk

# View differences
cdk diff

# Destroy the stack
cdk destroy
```

### Option 3: Serverless Framework

Serverless Framework provides a developer-friendly deployment experience.

#### Deploy with Serverless

```bash
# Deploy
npm run deploy:serverless

# Optional: include VoltOps keys
npm run deploy:serverless -- \
  --param="voltAgentPublicKey=pk-your-key-here" \
  --param="voltAgentSecretKey=sk-your-key-here"
```

#### Local development with Serverless

```bash
npm run dev:serverless

# Test locally
curl http://localhost:3000/agents
```

## Testing Your Deployment

After deployment, each tool will output an API Gateway URL. Test your VoltAgent API:

```bash
# Health check
curl https://your-api-gateway-url/

# List agents
curl https://your-api-gateway-url/agents

# Invoke the assistant
curl -X POST https://your-api-gateway-url/agents/lambda-assistant/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is the weather in Berlin?"}]
  }'

# Check observability
curl https://your-api-gateway-url/observability/traces
```

## Project Structure

```
with-aws-lambda/
├── src/
│   ├── index.ts           # VoltAgent configuration
│   ├── lambda.ts          # AWS Lambda handler
│   └── tools/index.ts     # Sample weather tool
├── cdk/
│   ├── app.ts             # CDK app entry point
│   └── voltagent-stack.ts # CDK stack definition
├── template.yaml          # AWS SAM template
├── samconfig.toml         # SAM configuration
├── serverless.yml         # Serverless Framework config
├── cdk.json              # CDK configuration
├── package.json
├── tsconfig.json
└── example.env
```

## Configuration Notes

### Environment Variables

All deployment methods support these environment variables:

- `AWS_REGION` (automatic): Set by Lambda runtime, defaults to us-east-1 in code
- `VOLTAGENT_PUBLIC_KEY` (optional): VoltOps public key for observability
- `VOLTAGENT_SECRET_KEY` (optional): VoltOps secret key for observability

### Amazon Bedrock Setup

Before deploying, ensure you have:

1. **Model Access**: Enable access to desired models in the Amazon Bedrock console
2. **Region Support**: Deploy in a region where Bedrock is available (us-east-1, us-west-2, etc.)
3. **IAM Permissions**: The deployment configurations automatically include necessary `bedrock:InvokeModel` permissions

### Memory and Timeout

Default Lambda configuration:
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Runtime**: Node.js 20

Adjust these in your deployment configuration files as needed.

## Cleanup

To remove your deployment:

```bash
# AWS SAM
sam delete

# AWS CDK
cdk destroy

# Serverless Framework
serverless remove
```

## Observability

- In-memory span/log storage is active by default
- Observability endpoints available at `/observability/*`
- VoltOps integration uses HTTP polling (no WebSocket streaming on Lambda)
- View logs in AWS CloudWatch

## Limitations

- **MCP client/server**: Not available on Lambda (requires Node.js stdio/network APIs)
- **libSQL memory adapter**: Not supported (use InMemoryStorageAdapter or external databases)
- **WebSocket streaming**: Not available (VoltOps Console uses HTTP polling)

## Troubleshooting

### Build Issues

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Deployment Issues

- Ensure AWS CLI is configured: `aws configure list`
- Check IAM permissions for Lambda, API Gateway, and CloudFormation
- Verify your API keys are correct

### Runtime Issues

- Check CloudWatch logs: `aws logs tail /aws/lambda/your-function-name --follow`
- Increase memory if you see timeout errors
- Verify Bedrock model access is enabled in your AWS account region
- Ensure IAM permissions include `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream`

## Next Steps

- Explore [VoltAgent documentation](https://docs.volt.ag) for advanced features
- Try different Amazon Bedrock models (Claude 3.5, Llama 3.2, Mistral, etc.)
- Add custom tools and memory adapters
- Configure external databases for persistent storage
- Set up CI/CD pipelines for automated deployments
- Integrate with other AWS services (S3, DynamoDB, etc.)