import {
  APIGatewayProxyEvent,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { DatabaseService } from "../services/DatabaseService";
import { CognitoUser } from "../models/CognitoUser";
import { getEpochMillisBeforeDay } from "../utils/utils";

const databaseService = new DatabaseService();
const bonusTimeDays = 7;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyStructuredResultV2> => {
  const eventString = JSON.stringify(event, null, 2);
  console.log("EVENT: \n" + eventString);
  const cognitoUser = JSON.parse(eventString).user as CognitoUser;
  const cognitoUserJSON = JSON.stringify(cognitoUser);
  console.log(`Fetched user: ${cognitoUserJSON}`);
  const timestamp = getEpochMillisBeforeDay(bonusTimeDays);
  const hasLastVideo = await databaseService.hasLastVideoByTimeAfter(
    cognitoUser.id,
    timestamp.toString()
  );
  if (hasLastVideo) {
    console.log(
      `A new bonus video is not available to user because the last bonus video was received in ${bonusTimeDays} days. 
      User: ${cognitoUserJSON}`
    );
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: "Bonus video is not available yet",
      }),
    };
  }
  console.log(`A new bonus video is available to user: ${cognitoUserJSON}`);
  return {
    statusCode: 200,
    body: JSON.stringify({
      userId: cognitoUser.id,
    }),
  };
};
