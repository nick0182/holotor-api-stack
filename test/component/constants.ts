import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClientConfig,
  KeyType,
  ScalarAttributeType,
} from "@aws-sdk/client-dynamodb";
import * as dotenv from "dotenv";

dotenv.config();

export type Table = "user-bonus-videos" | "bonus-videos";

const userBonusVideosPartitionKey = "user_id";

const userBonusVideosSortKey = "video_retrieval_ts";

const userBonusVideosTableName = `${process.env.ENVIRONMENT}-user-bonus-videos`;

const bonusVideosPartitionKey = "video_id";

const bonusVideosTableName = `${process.env.ENVIRONMENT}-bonus-videos`;

export const mockUserId1 = "user123";

export const mockUserId2 = "user456";

export const mockVideoId1 = "video123";

export const mockVideoId2 = "video456";

export const mockVideoId3 = "video789";

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

export const tableNames: Record<Table, string> = {
  "user-bonus-videos": userBonusVideosTableName,
  "bonus-videos": bonusVideosTableName,
};

export const createTableCommands: Record<Table, CreateTableCommand> = {
  "user-bonus-videos": new CreateTableCommand({
    TableName: userBonusVideosTableName,
    KeySchema: [
      {
        AttributeName: userBonusVideosPartitionKey,
        KeyType: KeyType.HASH,
      },
      {
        AttributeName: userBonusVideosSortKey,
        KeyType: KeyType.RANGE,
      },
    ],
    AttributeDefinitions: [
      {
        AttributeName: userBonusVideosPartitionKey,
        AttributeType: ScalarAttributeType.S,
      },
      {
        AttributeName: userBonusVideosSortKey,
        AttributeType: ScalarAttributeType.N,
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  }),
  "bonus-videos": new CreateTableCommand({
    TableName: bonusVideosTableName,
    KeySchema: [
      {
        AttributeName: bonusVideosPartitionKey,
        KeyType: KeyType.HASH,
      },
    ],
    AttributeDefinitions: [
      {
        AttributeName: bonusVideosPartitionKey,
        AttributeType: ScalarAttributeType.S,
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  }),
};

export const deleteTableCommands: Record<Table, DeleteTableCommand> = {
  "user-bonus-videos": new DeleteTableCommand({
    TableName: userBonusVideosTableName,
  }),
  "bonus-videos": new DeleteTableCommand({
    TableName: bonusVideosTableName,
  }),
};
