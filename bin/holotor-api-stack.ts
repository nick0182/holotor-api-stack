#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { HolotorApiStackStack } from "../lib/holotor-api-stack-stack";

const app = new cdk.App();
const stage = app.node.tryGetContext("stage") as string;
const serviceName = "holotor-api-stack";
new HolotorApiStackStack(app, `${stage}-${serviceName}`, {
  stackName: `${stage}-${serviceName}`,
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_REGION,
  },
});
