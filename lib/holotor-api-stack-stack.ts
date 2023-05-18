import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  AccessLogFormat,
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  EndpointType,
  LogGroupLogDestination,
  MethodLoggingLevel,
  RestApi,
  StepFunctionsIntegration,
} from "aws-cdk-lib/aws-apigateway";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import {
  AccountRecovery,
  UserPool,
  UserPoolClientIdentityProvider,
  UserPoolClientOptions,
} from "aws-cdk-lib/aws-cognito";
import {
  Choice,
  Condition,
  Fail,
  LogLevel,
  Pass,
  RetryProps,
  StateMachine,
  StateMachineType,
} from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import * as path from "path";
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
} from "aws-cdk-lib/aws-s3";
import * as fs from "fs";

export interface HolotorStackProps extends StackProps {
  readonly stage: string;
}

// TODO: enable API GW caching in production
export class HolotorApiStackStack extends Stack {
  constructor(scope: Construct, id: string, props: HolotorStackProps) {
    super(scope, id, props);
    const responseTemplate = this.readResource(
      "resources/response-template.txt"
    );
    const cognitoUserPoolAuthorizer = this.createCognitoAuthorizer(
      this.createCognitoUserPool(props.stage)
    );

    this.createUsersS3Bucket(props.stage);
    this.createBonusVideosS3Bucket(props.stage);

    const lambdaBasicRole: Role = this.createLambdaBasicRole(props.stage);

    const userHasLastVideoLambda: NodejsFunction =
      this.createUserHasLastVideoLambda(props.stage, lambdaBasicRole);
    const bonusVideoRetrieverLambda: NodejsFunction =
      this.createBonusVideoRetrieverLambda(props.stage, lambdaBasicRole);
    const copyBonusVideoSourceLambda: NodejsFunction =
      this.createCopyBonusVideoSourceLambda(props.stage, lambdaBasicRole);

    const flowPass: Pass = this.createFlowPass(props.stage);
    const flowFailure: Fail = this.createFlowFailure(props.stage);
    const userHasLastVideoRetry: RetryProps =
      this.createUserHasLastVideoRetry();
    const bonusVideoRetrieverRetry: RetryProps =
      this.createBonusVideoRetrieverRetry();
    const userHasLastVideoTask = this.createLambdaTask(
      `${props.stage}-holotor-ubv-check-user`,
      "Check whether user is eligible for getting a new bonus video",
      userHasLastVideoLambda
    );
    const bonusVideoRetrieverTask: tasks.LambdaInvoke = this.createLambdaTask(
      `${props.stage}-holotor-ubv-retrieve-bonus-video`,
      "Retrieve and remove a bonus video from bonus-videos table",
      bonusVideoRetrieverLambda
    );
    const copyBonusVideoTask: tasks.LambdaInvoke = this.createLambdaTask(
      `${props.stage}-holotor-ubv-copy-bonus-video-source`,
      "Copy bonus video source to user's bucket",
      copyBonusVideoSourceLambda
    );
    const checkUserChoice = this.createCheckUserChoice(props.stage);
    checkUserChoice
      .when(
        Condition.numberEquals("$.statusCode", 200),
        bonusVideoRetrieverTask
      )
      .when(Condition.numberEquals("$.statusCode", 404), flowPass)
      .otherwise(flowFailure);
    userHasLastVideoTask
      .addRetry(userHasLastVideoRetry)
      .addCatch(flowFailure)
      .next(checkUserChoice);
    bonusVideoRetrieverTask
      .addRetry(bonusVideoRetrieverRetry)
      .addCatch(flowFailure)
      .next(flowPass);

    const stateMachine = this.createStateMachine(
      props.stage,
      userHasLastVideoTask
    );

    const bonusVideosAPI: RestApi = this.createAPI(props.stage);
    const videoResource = bonusVideosAPI.root
      .addResource("api")
      .addResource("v1")
      .addResource("videos")
      .addResource("next");
    videoResource.addMethod(
      "POST",
      StepFunctionsIntegration.startExecution(stateMachine, {
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": responseTemplate,
            },
          },
        ],
        requestTemplates: {
          "application/json": this.createInput(stateMachine.stateMachineArn),
        },
        timeout: Duration.seconds(10),
      }),
      {
        authorizer: cognitoUserPoolAuthorizer,
        authorizationType: AuthorizationType.COGNITO,
      }
    );
    const userBonusVideosTable = this.createUserBonusVideosTable(props.stage);
    userBonusVideosTable.grantReadData(userHasLastVideoLambda);
    const bonusVideosTable: Table = this.createBonusVideosTable(props.stage);
    bonusVideosTable.grantReadWriteData(bonusVideoRetrieverLambda);
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

  private createAPI(stage: string): RestApi {
    const id = `${stage}-holotor-user-bonus-videos-api-gw`;
    return new RestApi(this, id, {
      cloudWatchRole: true,
      deployOptions: {
        accessLogDestination: new LogGroupLogDestination(
          this.createLogGroup(
            `${stage}-holotor-user-bonus-videos-api-log-group`
          )
        ),
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

  private createLogGroup(id: string): LogGroup {
    return new LogGroup(this, id, {
      retention: RetentionDays.ONE_MONTH,
    });
  }

  private createCognitoAuthorizer(holotorCognitoUserPool: UserPool) {
    return new CognitoUserPoolsAuthorizer(this, "holotor-cognito", {
      cognitoUserPools: [holotorCognitoUserPool],
    });
  }

  private createUserHasLastVideoLambda(stage: string, lambdaRole: Role) {
    return new NodejsFunction(this, `${stage}-holotor-ubv-check-user-lambda`, {
      architecture: Architecture.ARM_64,
      description:
        "Lambda for checking if the user is eligible for getting a new bonus video",
      environment: {
        ENVIRONMENT: stage,
      },
      entry: path.join(__dirname, `/../src/handler/checkUser.ts`),
      logRetention: RetentionDays.THREE_DAYS,
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(10),
      role: lambdaRole,
    });
  }

  private createBonusVideoRetrieverLambda(
    stage: string,
    lambdaRole: Role
  ): NodejsFunction {
    return new NodejsFunction(
      this,
      `${stage}-holotor-ubv-retrieve-bonus-video-lambda`,
      {
        architecture: Architecture.ARM_64,
        description:
          "Lambda for polling a bonus video from DynamoDB 'bonus-videos' table",
        environment: {
          ENVIRONMENT: stage,
        },
        entry: path.join(__dirname, `/../src/handler/pollBonusVideo.ts`),
        logRetention: RetentionDays.THREE_DAYS,
        runtime: Runtime.NODEJS_16_X,
        timeout: Duration.seconds(10),
        role: lambdaRole,
      }
    );
  }

  private createCopyBonusVideoSourceLambda(
    stage: string,
    lambdaRole: Role
  ): NodejsFunction {
    return new NodejsFunction(
      this,
      `${stage}-holotor-ubv-copy-bonus-video-source-lambda`,
      {
        architecture: Architecture.ARM_64,
        description:
          "Lambda for copying a bonus video from shared s3 bucket to user's s3 bucket",
        environment: {
          ENVIRONMENT: stage,
        },
        entry: path.join(__dirname, `/../src/handler/copyBonusVideoSource.ts`),
        logRetention: RetentionDays.THREE_DAYS,
        runtime: Runtime.NODEJS_16_X,
        timeout: Duration.seconds(10),
        role: lambdaRole,
      }
    );
  }

  private createCheckUserChoice(stage: string): Choice {
    return new Choice(this, `${stage}-holotor-ubv-check-user-choice`, {
      comment: "Route user based on previous check",
    });
  }

  private createFlowFailure(stage: string): Fail {
    return new Fail(this, `${stage}-holotor-ubv-fail`, {
      cause: "Server error occurred while handling the request",
      error: "Internal server error",
      comment: "Handling errors",
    });
  }

  private createUserHasLastVideoRetry(): RetryProps {
    return {
      errors: [
        "Lambda.ClientExecutionTimeoutException",
        "Lambda.ServiceException",
        "Lambda.AWSLambdaException",
        "Lambda.SdkClientException",
        "States.TaskFailed",
      ],
      maxAttempts: 2
    };
  }

  private createBonusVideoRetrieverRetry(): RetryProps {
    return {
      errors: [
        "Lambda.ClientExecutionTimeoutException",
        "Lambda.ServiceException",
        "Lambda.AWSLambdaException",
        "Lambda.SdkClientException",
        "BonusVideoAlreadyDeletedException",
      ],
      maxAttempts: 2
    };
  }

  private createFlowPass(stage: string): Pass {
    return new Pass(this, `${stage}-holotor-ubv-pass`, {
      comment: "Pass result to end user",
    });
  }

  private createLambdaTask(
    id: string,
    comment: string,
    lambdaFunction: NodejsFunction
  ): tasks.LambdaInvoke {
    return new tasks.LambdaInvoke(this, id, {
      comment: comment,
      lambdaFunction: lambdaFunction,
      payloadResponseOnly: true,
      retryOnServiceExceptions: false
    });
  }

  private createStateMachine(
    stage: string,
    entryTask: tasks.LambdaInvoke
  ): StateMachine {
    return new StateMachine(this, `${stage}-holotor-ubv-sm`, {
      definition: entryTask,
      logs: {
        destination: this.createLogGroup(`${stage}-holotor-ubv-sm-log-group`),
        level: LogLevel.ALL,
      },
      stateMachineName: "user-bonus-video-state-machine",
      stateMachineType: StateMachineType.EXPRESS,
      timeout: Duration.seconds(10),
    });
  }

  private createInput(stateMachineArn: string): string {
    const user = JSON.stringify({
      user: {
        id: "$context.authorizer.claims.sub",
        email: "$context.authorizer.claims.email",
      },
    });
    return JSON.stringify({
      input: user,
      stateMachineArn: stateMachineArn,
    });
  }

  private createLambdaBasicRole(stage: string): Role {
    return new Role(this, `${stage}-holotor-api-lambda-basic-role`, {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromManagedPolicyArn(
          this,
          `${stage}-holotor-api-lambda-basic-role-policy`,
          "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
      // inlinePolicies: {
      //   UserVideosReadWritePolicy: new PolicyDocument({
      //     statements: [
      //       new PolicyStatement({
      //         actions: ["s3:GetObject", "s3:PutObject"],
      //         effect: Effect.ALLOW,
      //         resources: [`arn:aws:s3:::${usersS3Bucket.bucketName}/*/videos/`],
      //       }),
      //     ],
      //   }),
      // },
    });
  }

  private createUserBonusVideosTable(stage: string): Table {
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

  private createBonusVideosTable(stage: string): Table {
    return new Table(this, `${stage}-holotor-bonus-videos-table`, {
      partitionKey: {
        name: "video_id",
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      tableName: `${stage}-bonus-videos`,
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

  private readResource(resourcePath: string): string {
    return fs.readFileSync(path.join(__dirname, resourcePath), "utf-8");
  }
}
