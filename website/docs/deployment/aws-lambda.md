---
title: AWS Lambda
description: Deploy VoltAgent to AWS Lambda using SAM, CDK, or Serverless Framework with Amazon Bedrock.
---

This guide explains how to deploy VoltAgent to AWS Lambda using various deployment tools with Amazon Bedrock as the LLM provider. AWS Lambda provides a serverless Node.js runtime that integrates seamlessly with Amazon Bedrock for AI model inference.

## Prerequisites

- Node.js 18+
- `pnpm` or `npm`
- AWS CLI configured with appropriate permissions
- One of: AWS SAM CLI, AWS CDK, or Serverless Framework
- Access to Amazon Bedrock models in your AWS account
- Optional: `VOLTAGENT_PUBLIC_KEY` and `VOLTAGENT_SECRET_KEY` if you use VoltOps observability

## 1. Generate project files

### Option A: VoltAgent CLI

```bash
npm run volt deploy --target aws-lambda
```

The CLI scaffolds deployment configuration files for your chosen tool (SAM, CDK, or Serverless Framework) along with the Lambda handler.

### Option B: Manual setup

1. Install your preferred deployment tool (`sam`, `aws-cdk`, or `serverless`).
2. Create the appropriate configuration file (see examples below).
3. Add a Lambda handler that bootstraps VoltAgent with `serverlessHono()`.

## 2. Amazon Bedrock setup

Before deploying, ensure you have access to Amazon Bedrock models:

1. **Enable model access** in the AWS Bedrock console for your desired models
2. **Choose your region** - Bedrock is available in specific regions (us-east-1, us-west-2, etc.)
3. **IAM permissions** - Your Lambda execution role needs `bedrock:InvokeModel` permissions

The deployment configurations below automatically include the necessary IAM permissions.

## 3. Environment variables

For VoltOps observability (optional), store them using your deployment tool's secret management:

```bash
# AWS SAM
sam deploy --parameter-overrides VoltAgentPublicKey=pk_... VoltAgentSecretKey=sk_...

# AWS CDK
cdk deploy --context voltAgentPublicKey=pk_... --context voltAgentSecretKey=sk_...

# Serverless Framework
serverless deploy --param="voltAgentPublicKey=pk_..." --param="voltAgentSecretKey=sk_..."
```

## 4. Lambda handler

Create a handler that converts AWS Lambda events to VoltAgent requests:

```ts title="src/lambda.ts"
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { VoltAgent, Agent, Memory, InMemoryStorageAdapter } from "@voltagent/core";
import { serverlessHono, createAwsLambdaHandler } from "@voltagent/serverless-hono";
import { weatherTool } from "./tools";

// Configure Amazon Bedrock provider
// Lambda automatically provides IAM role credentials
const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION || "us-east-1",
  credentialProvider: fromNodeProviderChain(),
});

const memory = new Memory({
  storage: new InMemoryStorageAdapter({
    storageLimit: 50,
  }),
});

const agent = new Agent({
  name: "lambda-assistant",
  instructions: "Answer user questions quickly and efficiently. You are powered by Amazon Bedrock.",
  model: bedrock("anthropic.claude-3-5-sonnet-20241022-v2:0"),
  tools: [weatherTool],
  memory,
});

const voltAgent = new VoltAgent({
  agents: { agent },
  serverless: serverlessHono(),
});

export const handler = createAwsLambdaHandler(voltAgent);
```

> Tip: On Lambda, WebSocket streaming is not available. VoltOps Console uses HTTP polling instead.

## 5. Deployment configurations

### AWS SAM

```yaml title="template.yaml"
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Parameters:
  VoltAgentPublicKey:
    Type: String
    Description: VoltOps public key (optional)
    Default: ""
  VoltAgentSecretKey:
    Type: String
    Description: VoltOps secret key (optional)
    NoEcho: true
    Default: ""

Globals:
  Function:
    Timeout: 30
    MemorySize: 512
    Runtime: nodejs20.x

Resources:
  VoltAgentFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: dist/
      Handler: lambda.handler
      Description: VoltAgent serverless function powered by Amazon Bedrock
      Policies:
        - Statement:
          - Effect: Allow
            Action:
              - bedrock:InvokeModel
              - bedrock:InvokeModelWithResponseStream
            Resource: "*"
      Environment:
        Variables:
          VOLTAGENT_PUBLIC_KEY: !Ref VoltAgentPublicKey
          VOLTAGENT_SECRET_KEY: !Ref VoltAgentSecretKey
      Events:
        ApiEvent:
          Type: Api
          Properties:
            Path: /{proxy+}
            Method: ANY
        RootEvent:
          Type: Api
          Properties:
            Path: /
            Method: ANY

Outputs:
  VoltAgentApi:
    Description: "API Gateway endpoint URL"
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/"
```

### AWS CDK

```ts title="lib/voltagent-stack.ts"
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class VoltAgentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const voltAgentFunction = new lambda.Function(this, 'VoltAgentFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset('dist'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        VOLTAGENT_PUBLIC_KEY: this.node.tryGetContext('voltAgentPublicKey') || '',
        VOLTAGENT_SECRET_KEY: this.node.tryGetContext('voltAgentSecretKey') || '',
      },
      description: 'VoltAgent serverless function powered by Amazon Bedrock',
    });

    // Add Bedrock permissions
    voltAgentFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
      resources: ['*'],
    }));

    const api = new apigateway.RestApi(this, 'VoltAgentApi', {
      restApiName: 'VoltAgent Service',
      description: 'API for VoltAgent Lambda function.',
    });

    const integration = new apigateway.LambdaIntegration(voltAgentFunction);
    api.root.addMethod('ANY', integration);

    const proxyResource = api.root.addResource('{proxy+}');
    proxyResource.addMethod('ANY', integration);

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'VoltAgent API URL',
    });
  }
}
```

### Serverless Framework

```yaml title="serverless.yml"
service: voltagent-lambda

frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs20.x
  stage: dev
  region: us-east-1
  timeout: 30
  memorySize: 512
  environment:
    VOLTAGENT_PUBLIC_KEY: ${param:voltAgentPublicKey, ""}
    VOLTAGENT_SECRET_KEY: ${param:voltAgentSecretKey, ""}
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - bedrock:InvokeModel
            - bedrock:InvokeModelWithResponseStream
          Resource: "*"

functions:
  voltagent:
    handler: dist/lambda.handler
    description: VoltAgent serverless function powered by Amazon Bedrock
    events:
      - http:
          path: /
          method: ANY
      - http:
          path: /{proxy+}
          method: ANY

plugins:
  - serverless-offline

custom:
  serverless-offline:
    httpPort: 3000
```

## 6. Build and deploy

### AWS SAM

```bash
# Build TypeScript
pnpm build

# Deploy
sam build
sam deploy --guided
```

### AWS CDK

```bash
# Build TypeScript
pnpm build

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy
cdk deploy
```

### Serverless Framework

```bash
# Build TypeScript
pnpm build

# Deploy
serverless deploy
```

## 7. Test your deployment

After deployment, test your VoltAgent API:

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
```

## Observability notes

- In-memory span/log storage is active by default. You can fetch traces through the `/observability` REST endpoints.
- If VoltOps credentials are present, the Lambda exports telemetry via OTLP fetch calls. These calls use Lambda's execution context properly.
- VoltOps Console falls back to HTTP polling. There is no WebSocket streaming on Lambda.
- The handler sets `callbackWaitsForEmptyEventLoop = false` to prevent Lambda from waiting for background tasks.

## Feature limitations on AWS Lambda

- **MCP client/server** are not available on Lambda. The current MCP implementation depends on Node.js stdio/network APIs that are not suitable for the Lambda execution model.
- **libSQL memory adapter** is not supported. Use the bundled `InMemoryStorageAdapter` or connect to an external database (RDS PostgreSQL/Aurora) via their HTTP clients.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

### Memory configuration examples

<Tabs>
  <TabItem value="in-memory" label="In-memory (default)" default>

```ts
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { Memory, InMemoryStorageAdapter } from "@voltagent/core";

const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION || "us-east-1",
  credentialProvider: fromNodeProviderChain(),
});

const memory = new Memory({
  storage: new InMemoryStorageAdapter({
    storageLimit: 50,
  }),
});

const agent = new Agent({
  name: "lambda-assistant",
  instructions: "Answer user questions quickly.",
  model: bedrock("anthropic.claude-3-5-sonnet-20241022-v2:0"),
  tools: [weatherTool],
  memory,
});
```

  </TabItem>
  <TabItem value="rds-postgres" label="RDS PostgreSQL">

```ts
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { Memory } from "@voltagent/core";
import { PostgresMemoryAdapter, PostgresVectorAdapter } from "@voltagent/postgres";

const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION || "us-east-1",
  credentialProvider: fromNodeProviderChain(),
});

const memory = new Memory({
  storage: new PostgresMemoryAdapter({
    connectionString: process.env.RDS_POSTGRES_URL,
  }),
  vector: new PostgresVectorAdapter({
    connectionString: process.env.RDS_POSTGRES_URL,
  }),
});

const agent = new Agent({
  name: "lambda-assistant",
  instructions: "Answer user questions quickly.",
  model: bedrock("anthropic.claude-3-5-sonnet-20241022-v2:0"),
  tools: [weatherTool],
  memory,
});
```

  </TabItem>
  <TabItem value="supabase" label="Supabase">

```ts
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { Memory } from "@voltagent/core";
import { SupabaseMemoryAdapter } from "@voltagent/supabase";

const bedrock = createAmazonBedrock({
  region: process.env.AWS_REGION || "us-east-1",
  credentialProvider: fromNodeProviderChain(),
});

const memory = new Memory({
  storage: new SupabaseMemoryAdapter({
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }),
});

const agent = new Agent({
  name: "lambda-assistant",
  instructions: "Answer user questions quickly.",
  model: bedrock("anthropic.claude-3-5-sonnet-20241022-v2:0"),
  tools: [weatherTool],
  memory,
});
```

  </TabItem>
</Tabs>

Monitor your deployment with AWS CloudWatch logs and adjust the Lambda configuration as needed. After these steps your VoltAgent app is live on AWS Lambda.