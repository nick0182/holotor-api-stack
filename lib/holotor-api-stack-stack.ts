import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  AccessLogFormat,
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  EndpointType,
  LambdaIntegration,
  LogGroupLogDestination,
  MethodLoggingLevel,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Architecture, IFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import {
  AccountRecovery,
  UserPool,
  UserPoolClientIdentityProvider,
  UserPoolClientOptions,
} from "aws-cdk-lib/aws-cognito";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import * as path from "path";

export interface HolotorStackProps extends StackProps {
  readonly stage: string;
}

// TODO: enable API GW caching in production
export class HolotorApiStackStack extends Stack {
  constructor(scope: Construct, id: string, props: HolotorStackProps) {
    super(scope, id, props);
    const holotorCognitoUserPool = this.createCognitoUserPool(
      `${props.stage}-holotor-user-pool`,
      props.stage
    );
    const holotorAPI = new RestApi(this, `${props.stage}-holotor-api`, {
      cloudWatchRole: true,
      deployOptions: {
        accessLogDestination: this.createLogGroupDestination(props.stage),
        accessLogFormat: AccessLogFormat.jsonWithStandardFields(),
        dataTraceEnabled: true, // for dev environment only
        loggingLevel: MethodLoggingLevel.INFO,
        metricsEnabled: true,
        stageName: props.stage,
        throttlingBurstLimit: 10, // number of concurrent requests
        throttlingRateLimit: 100, // number of requests per second
      },
      endpointTypes: [EndpointType.REGIONAL],
      restApiName: `${props.stage}-holotor-api`,
      retainDeployments: false,
    });
    const videoResource = holotorAPI.root
      .addResource("api")
      .addResource("v1")
      .addResource("videos")
      .addResource("next");
    const holotorLambda = this.buildLambda(`${props.stage}-holotor-api-lambda`);
    videoResource.addMethod(
      "POST",
      this.createLambdaIntegration(holotorLambda),
      {
        authorizer: this.createCognitoAuthorizer(holotorCognitoUserPool),
        authorizationType: AuthorizationType.COGNITO,
      }
    );
    const bonusVideosTable = this.createDynamoDBTable(
      `${props.stage}-holotor-user-bonus-videos-table`
    );
    bonusVideosTable.grantReadWriteData(holotorLambda);
  }

  private createCognitoUserPool(id: string, stage: string) {
    const holotorCognitoUserPool = new UserPool(this, id, {
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      autoVerify: {
        email: true,
      },
      deviceTracking: {
        challengeRequiredOnNewDevice: false,
        deviceOnlyRememberedOnUserPrompt: false,
      },
      passwordPolicy: {
        requireSymbols: false,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      userPoolName: id,
    });
    const userPoolClientId = `${stage}-holotor-cognito-desktop-app-client`;
    holotorCognitoUserPool.addClient(
      userPoolClientId,
      this.createUserPoolClient(userPoolClientId)
    );
    holotorCognitoUserPool.addDomain(
      `${stage}-holotor-cognito-desktop-app-client-domain`,
      this.createUserPoolDomain(stage)
    );
    return holotorCognitoUserPool;
  }

  private createUserPoolClient(id: string): UserPoolClientOptions {
    return {
      authFlows: {
        userSrp: true,
      },
      generateSecret: true,
      oAuth: {
        callbackUrls: [
          "http://localhost:34587",
          "http://localhost:48715",
          "http://localhost:53652",
        ],
        flows: {
          authorizationCodeGrant: true,
        },
      },
      preventUserExistenceErrors: true,
      supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO],
      userPoolClientName: id,
    };
  }

  private createUserPoolDomain(stage: string) {
    return {
      cognitoDomain: {
        domainPrefix: `${stage}-holotor`,
      },
    };
  }

  private createLogGroupDestination(stage: string) {
    const holotorAPILogGroup = new LogGroup(
      this,
      `${stage}-holotor-api-log-group`,
      {
        retention: RetentionDays.ONE_MONTH,
      }
    );
    return new LogGroupLogDestination(holotorAPILogGroup);
  }

  private createLambdaIntegration(holotorLambda: IFunction) {
    return new LambdaIntegration(holotorLambda, {
      allowTestInvoke: false,
    });
  }

  private createCognitoAuthorizer(holotorCognitoUserPool: UserPool) {
    return new CognitoUserPoolsAuthorizer(this, "holotor-cognito", {
      cognitoUserPools: [holotorCognitoUserPool],
    });
  }

  private buildLambda(id: string) {
    return new NodejsFunction(this, id, {
      architecture: Architecture.ARM_64,
      description: "Holotor API lambda",
      entry: path.join(__dirname, `/../src/handler/app.ts`),
      logRetention: RetentionDays.THREE_DAYS,
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(10),
      role: this.createLambdaBasicRoleWithManagedPolicy(`${id}-role`),
    });
  }

  private createLambdaBasicRoleWithManagedPolicy(id: string) {
    return new Role(this, id, {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromManagedPolicyArn(
          this,
          `${id}-policy`,
          "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });
  }

  private createDynamoDBTable(id: string) {
    return new Table(this, id, {
      partitionKey: {
        name: "user_id",
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      sortKey: {
        name: "video_retrieval_ts",
        type: AttributeType.NUMBER,
      },
      tableName: "user_bonus_videos",
    });
  }
}
