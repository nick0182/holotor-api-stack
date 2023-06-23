import {
  DeleteItemCommand,
  DeleteItemCommandOutput,
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  QueryCommandOutput,
  ReturnConsumedCapacity,
  ReturnValue,
  ScanCommand,
  ScanCommandOutput,
} from "@aws-sdk/client-dynamodb";

const environment = process.env.ENVIRONMENT as string;

const queryKeyConditionExpression = "user_id = :a AND video_retrieval_ts > :b";

const bonusVideosTableKey = "video_id";

const bonusVideosTableName = `${environment}-bonus-videos`;

const userBonusVideosTableName = `${environment}-user-bonus-videos`;

export class DatabaseService {
  constructor(
    private readonly dbClient: DynamoDBClient = new DynamoDBClient({})
  ) {}

  async hasLastVideoByTimeAfter(
    userId: string,
    afterMillis: string
  ): Promise<boolean> {
    console.log(
      `Checking user has last video by time after; userId: ${userId}, timeAfter millis: ${afterMillis}`
    );
    return this.dbClient
      .send(
        new QueryCommand({
          TableName: userBonusVideosTableName,
          KeyConditionExpression: queryKeyConditionExpression,
          ExpressionAttributeValues: {
            ":a": { S: userId },
            ":b": { N: afterMillis },
          },
          ReturnConsumedCapacity: ReturnConsumedCapacity.NONE,
        })
      )
      .then((res: QueryCommandOutput) => (res.Count ?? 0) > 0);
  }

  async readBonusVideo(): Promise<string | undefined> {
    console.log("Reading a bonus video");
    return this.dbClient
      .send(
        new ScanCommand({
          TableName: bonusVideosTableName,
          ConsistentRead: true,
          Limit: 1,
          ProjectionExpression: bonusVideosTableKey,
          ReturnConsumedCapacity: ReturnConsumedCapacity.NONE,
        })
      )
      .then((res: ScanCommandOutput) => {
        console.log(`Read bonus videos response: ${JSON.stringify(res)}`);
        const items = res.Items;
        if (!items || items.length == 0) {
          console.error("No items found in bonus videos table");
          return undefined;
        }
        return items[0][bonusVideosTableKey]?.S;
      });
  }

  async deleteBonusVideo(videoId: string): Promise<string | undefined> {
    console.log(`Deleting bonus video: ${videoId}`);
    return this.dbClient
      .send(
        new DeleteItemCommand({
          TableName: bonusVideosTableName,
          Key: {
            video_id: {
              S: videoId,
            },
          },
          ReturnValues: ReturnValue.ALL_OLD,
          ReturnConsumedCapacity: ReturnConsumedCapacity.NONE,
        })
      )
      .then((res: DeleteItemCommandOutput) => {
        console.log(`Delete bonus video response: ${JSON.stringify(res)}`);
        const itemAttributes = res.Attributes;
        if (!itemAttributes) {
          console.error(`No item found for deletion by video id: ${videoId}`);
          return undefined;
        }
        return videoId;
      });
  }

  async storeBonusVideo(videoId: string): Promise<void> {
    console.log(`Storing bonus video: ${videoId}`);
    return this.dbClient
      .send(
        new PutItemCommand({
          TableName: bonusVideosTableName,
          Item: {
            video_id: {
              S: videoId,
            },
          },
          ReturnConsumedCapacity: ReturnConsumedCapacity.NONE,
          ReturnValues: ReturnValue.NONE,
        })
      )
      .then(() => {
        console.log(
          `Store bonus video response was success. videoId: ${videoId}`
        );
      });
  }
}
