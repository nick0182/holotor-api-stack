import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

export class DatabaseService {
  constructor(private readonly dbClient: DynamoDBClient = new DynamoDBClient({})) {}

  async hasLastVideoByTimeAfter(
    userId: string,
    afterMillis: string
  ): Promise<boolean> {
    console.log(
      `Checking user has last video by time after; userId: ${userId}, timeAfter millis: ${afterMillis}`
    );
    const result = await this.dbClient.send(
      new QueryCommand({
        TableName: "user_bonus_videos",
        KeyConditionExpression: "user_id = :a AND video_retrieval_ts > :b",
        ExpressionAttributeValues: {
          ":a": { S: userId },
          ":b": { N: afterMillis }
        },
      })
    );
    return (result.Count ?? 0) > 0;
  }
}
