import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClientConfig,
  KeyType,
  ScalarAttributeType,
} from "@aws-sdk/client-dynamodb";

const partitionKey = "user_id";

const sortKey = "video_retrieval_ts";

export const tableName = "user_bonus_videos";

export const mockUserId1 = "user123";

export const mockUserId2 = "user456";

export const successResult = {
  $metadata: {
    httpStatusCode: 200,
  },
};

export const clientConfig: DynamoDBClientConfig = {
  credentials: {
    accessKeyId: "dummyAccessKeyId",
    secretAccessKey: "dummySecretAccessKey",
  },
  endpoint: "http://localhost:8000/",
  region: "us-west-2",
};

export const createTableCommand: CreateTableCommand = new CreateTableCommand({
  TableName: tableName,
  KeySchema: [
    {
      AttributeName: partitionKey,
      KeyType: KeyType.HASH,
    },
    {
      AttributeName: sortKey,
      KeyType: KeyType.RANGE,
    },
  ],
  AttributeDefinitions: [
    {
      AttributeName: partitionKey,
      AttributeType: ScalarAttributeType.S,
    },
    {
      AttributeName: sortKey,
      AttributeType: ScalarAttributeType.N,
    },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5,
  },
});

export const deleteTableCommand = new DeleteTableCommand({
  TableName: tableName,
});
