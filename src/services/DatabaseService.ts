import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({});

export async function hasLastVideoByTimeAfter(
  userId: string,
  afterMillis: string
): Promise<boolean> {
  console.log(
    `Checking user has last video by time after; userId: ${userId}, timeAfter millis: ${afterMillis}`
  );
  const result = await client.send(
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
