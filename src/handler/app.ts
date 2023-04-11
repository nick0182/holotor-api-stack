import {
  APIGatewayProxyEvent,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { DatabaseService } from "../services/DatabaseService";
import { CognitoUser } from "../models/CognitoUser";
import { getEpochMillisBeforeDay } from "../utils/Utils";

const databaseService = new DatabaseService();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyStructuredResultV2> => {
  const eventString = JSON.stringify(event, null, 2);
  console.log("EVENT: \n" + eventString);
  const cognitoUser = JSON.parse(eventString).user as CognitoUser;
  const cognitoUserJSON = JSON.stringify(cognitoUser);
  console.log(`Fetched user: ${cognitoUserJSON}`);
  const beforeWeekEpochMillis = getEpochMillisBeforeDay(7);
  const hasLastVideo = await databaseService.hasLastVideoByTimeAfter(
    cognitoUser.id,
    beforeWeekEpochMillis.toString()
  );
  if (!hasLastVideo) {
    console.log(
      `Bonus video is not available. User: ${cognitoUserJSON}`
    );
    return {
      statusCode: 403,
      body: "Bonus video is not available",
    };
  }
  console.log(`User has last video. User: ${cognitoUserJSON}`);
  return {
    statusCode: 200,
    body: "Bonus video downloadable link",
  };
};
