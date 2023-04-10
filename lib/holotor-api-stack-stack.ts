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
import {
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import {
  AccountRecovery,
  UserPool,
  UserPoolClientIdentityProvider,
  UserPoolClientOptions,
} from "aws-cdk-lib/aws-cognito";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import * as path from "path";
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
} from "aws-cdk-lib/aws-s3";

export interface HolotorStackProps extends StackProps {
  readonly stage: string;
}

// TODO: enable API GW caching in production
export class HolotorApiStackStack extends Stack {
  constructor(scope: Construct, id: string, props: HolotorStackProps) {
    super(scope, id, props);
    const holotorCognitoUserPool: UserPool = this.createCognitoUserPool(
      props.stage
    );
    const holotorAPI: RestApi = this.createRestApi(props.stage);
    const videoResource = holotorAPI.root
      .addResource("api")
      .addResource("v1")
      .addResource("videos")
      .addResource("next");
    const usersS3Bucket = this.createUsersS3Bucket(props.stage);
    const holotorLambda = this.buildLambda(props.stage, usersS3Bucket);
    videoResource.addMethod(
      "POST",
      this.createLambdaIntegration(holotorLambda),
      {
        authorizer: this.createCognitoAuthorizer(holotorCognitoUserPool),
        authorizationType: AuthorizationType.COGNITO,
      }
    );
    const bonusVideosTable = this.createDynamoDBTable(props.stage);
    const bonusVideosS3Bucket = this.createBonusVideosS3Bucket(props.stage);
    bonusVideosTable.grantReadWriteData(holotorLambda);
    bonusVideosS3Bucket.grantRead(holotorLambda);
  }

  private createCognitoUserPool(stage: string) {
    const id = `${stage}-holotor-user-pool`;
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

  private createRestApi(stage: string): RestApi {
    const id = `${stage}-holotor-api`;
    return new RestApi(this, id, {
      cloudWatchRole: true,
      deployOptions: {
        accessLogDestination: this.createLogGroupDestination(stage),
        accessLogFormat: AccessLogFormat.jsonWithStandardFields(),
        dataTraceEnabled: true, // for dev environment only
        loggingLevel: MethodLoggingLevel.INFO,
        metricsEnabled: true,
        stageName: stage,
        throttlingBurstLimit: 10, // number of concurrent requests
        throttlingRateLimit: 100, // number of requests per second
      },
      endpointTypes: [EndpointType.REGIONAL],
      restApiName: id,
      retainDeployments: false,
    });
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

  private buildLambda(stage: string, usersS3Bucket: Bucket) {
    return new NodejsFunction(this, `${stage}-holotor-api-lambda`, {
      architecture: Architecture.ARM_64,
      description: "Holotor API lambda",
      environment: {
        ENVIRONMENT: stage,
      },
      entry: path.join(__dirname, `/../src/handler/app.ts`),
      logRetention: RetentionDays.THREE_DAYS,
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(10),
      role: this.createLambdaRole(stage, usersS3Bucket),
    });
  }

  private createLambdaRole(stage: string, usersS3Bucket: Bucket) {
    return new Role(this, `${stage}-holotor-api-lambda-role`, {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromManagedPolicyArn(
          this,
          `${stage}-holotor-api-lambda-role-policy`,
          "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
      inlinePolicies: {
        UserVideosReadWritePolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ["s3:GetObject", "s3:PutObject"],
              effect: Effect.ALLOW,
              resources: [`arn:aws:s3:::${usersS3Bucket.bucketName}/*/videos/`],
            }),
          ],
        }),
      },
    });
  }

  private createDynamoDBTable(stage: string) {
    return new Table(this, `${stage}-holotor-user-bonus-videos-table`, {
      partitionKey: {
        name: "user_id",
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      sortKey: {
        name: "video_retrieval_ts",
        type: AttributeType.NUMBER,
      },
      tableName: `${stage}-user-bonus-videos`,
    });
  }

  private createBonusVideosS3Bucket(stage: string): Bucket {
    return new Bucket(this, `${stage}-holotor-bonus-videos-s3-bucket`, {
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      bucketName: `${stage}-holotor-bonus-videos`,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }

  private createUsersS3Bucket(stage: string): Bucket {
    return new Bucket(this, `${stage}-holotor-users-s3-bucket`, {
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      bucketName: `${stage}-holotor-users`,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      transferAcceleration: false, // can be turned on for production
    });
  }
}
