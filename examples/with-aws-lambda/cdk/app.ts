#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { VoltAgentStack } from './voltagent-stack';

const app = new cdk.App();

new VoltAgentStack(app, 'VoltAgentStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});