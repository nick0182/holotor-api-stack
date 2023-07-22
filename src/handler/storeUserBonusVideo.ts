import { Payload } from "../models/Payload";
import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { DatabaseService } from "../services/DatabaseService";

const databaseService = new DatabaseService();

export const handler = async (
  event: Payload
): Promise<APIGatewayProxyStructuredResultV2> => {
  const payloadString = JSON.stringify(event, null, 2);
  console.log("Payload:\n" + payloadString);
  const body = JSON.parse(event.body);
  await databaseService.storeUserBonusVideo(body.userId, body.videoId);
  return {
    statusCode: 200,
    body: event.body,
  };
};
