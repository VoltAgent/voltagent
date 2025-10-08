import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class VoltAgentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get environment variables from context
    const voltAgentPublicKey = this.node.tryGetContext('voltAgentPublicKey') || '';
    const voltAgentSecretKey = this.node.tryGetContext('voltAgentSecretKey') || '';

    // Create the Lambda function
    const voltAgentFunction = new lambda.Function(this, 'VoltAgentFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset('dist'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        VOLTAGENT_PUBLIC_KEY: voltAgentPublicKey,
        VOLTAGENT_SECRET_KEY: voltAgentSecretKey,
      },
      description: 'VoltAgent serverless function powered by Amazon Bedrock',
    });

    // Add Bedrock permissions to the Lambda function
    voltAgentFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
      resources: ['*'],
    }));

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'VoltAgentApi', {
      restApiName: 'VoltAgent Service',
      description: 'API for VoltAgent Lambda function',
      deployOptions: {
        stageName: 'prod',
      },
    });

    // Create Lambda integration
    const integration = new apigateway.LambdaIntegration(voltAgentFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    // Add root route
    api.root.addMethod('ANY', integration);

    // Add proxy route for all paths
    const proxyResource = api.root.addResource('{proxy+}');
    proxyResource.addMethod('ANY', integration);

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'VoltAgent API Gateway URL',
    });

    // Output the function ARN
    new cdk.CfnOutput(this, 'FunctionArn', {
      value: voltAgentFunction.functionArn,
      description: 'VoltAgent Lambda Function ARN',
    });
  }
}