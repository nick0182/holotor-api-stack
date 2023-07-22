import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClientConfig,
  KeyType,
  ScalarAttributeType,
} from "@aws-sdk/client-dynamodb";
import * as dotenv from "dotenv";
import {ProjectionType} from "aws-cdk-lib/aws-dynamodb";

dotenv.config();

export type Table = "user-bonus-videos" | "bonus-videos";

const userBonusVideosUserId = "user_id";

const userBonusVideosVideoId = "video_id";

const userBonusVideosGetVideoTimestamp = "get_video_ts";

const userBonusVideosIndexName = "user_id-get_video_ts";

export const userBonusVideosTableName = `${process.env.ENVIRONMENT}-bonus-videos-of-user`;

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
        AttributeName: userBonusVideosUserId,
        KeyType: KeyType.HASH,
      },
      {
        AttributeName: userBonusVideosVideoId,
        KeyType: KeyType.RANGE,
      },
    ],
    AttributeDefinitions: [
      {
        AttributeName: userBonusVideosUserId,
        AttributeType: ScalarAttributeType.S,
      },
      {
        AttributeName: userBonusVideosVideoId,
        AttributeType: ScalarAttributeType.S,
      },
      {
        AttributeName: userBonusVideosGetVideoTimestamp,
        AttributeType: ScalarAttributeType.N,
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
    GlobalSecondaryIndexes: [
      {
        IndexName: userBonusVideosIndexName,
        KeySchema: [
          {
            AttributeName: userBonusVideosUserId,
            KeyType: KeyType.HASH,
          },
          {
            AttributeName: userBonusVideosGetVideoTimestamp,
            KeyType: KeyType.RANGE,
          },
        ],
        Projection: {
          ProjectionType: ProjectionType.KEYS_ONLY
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      }
    ]
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
