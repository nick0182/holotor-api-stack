import {
  APIGatewayProxyEvent,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { hasLastVideoByTimeAfter } from "../services/DatabaseService";
import { CognitoUser } from "../models/CognitoUser";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyStructuredResultV2> => {
  console.log("EVENT: \n" + JSON.stringify(event, null, 2));
  const cognitoUser = fetchCognitoUser(event);
  console.log(`Fetched cognito user: ${JSON.stringify(cognitoUser)}`);
  const beforeWeekEpochMillis = getEpochMillisBeforeDay(7);
  const hasLastVideo = await hasLastVideoByTimeAfter(
    cognitoUser.id,
    beforeWeekEpochMillis.toString()
  );
  console.log(`User has last video: ${hasLastVideo}`);
  return {
    statusCode: 200,
    body: String(hasLastVideo),
  };
};

function fetchCognitoUser(event: APIGatewayProxyEvent): CognitoUser {
  const authClaims = event.requestContext.authorizer?.claims;
  if (authClaims === undefined) {
    throw new Error("No authClaims in event");
  } else {
    return {
      id: authClaims.sub,
      email: authClaims.email,
    };
  }
}

function getEpochMillisBeforeDay(beforeDay: number): number {
  const now = new Date();
  return now.setDate(now.getDate() - beforeDay);
}
