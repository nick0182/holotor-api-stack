import {
  DynamoDBClient,
  QueryCommand,
  ReturnConsumedCapacity,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";

const environment = process.env.ENVIRONMENT as string;

const queryKeyConditionExpression = "user_id = :a AND video_retrieval_ts > :b";

const bonusVideosTableKey = "video_id";

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
          TableName: `${environment}-user-bonus-videos`,
          KeyConditionExpression: queryKeyConditionExpression,
          ExpressionAttributeValues: {
            ":a": { S: userId },
            ":b": { N: afterMillis },
          },
          ReturnConsumedCapacity: ReturnConsumedCapacity.NONE,
        })
      )
      .then((res) => (res.Count ?? 0) > 0);
  }

  async readBonusVideo(): Promise<string | undefined> {
    console.log("Reading a bonus video");
    return this.dbClient
      .send(
        new ScanCommand({
          TableName: `${environment}-bonus-videos`,
          ConsistentRead: true,
          Limit: 1,
          ProjectionExpression: bonusVideosTableKey,
          ReturnConsumedCapacity: ReturnConsumedCapacity.NONE,
        })
      )
      .then((res) => {
        console.log(`Read bonus videos response: ${JSON.stringify(res)}`);
        const items = res.Items;
        if (items == undefined || items.length == 0) {
          console.error("No items found in bonus videos table");
          return undefined;
        }
        return items[0][bonusVideosTableKey]?.S;
      });
  }
}
