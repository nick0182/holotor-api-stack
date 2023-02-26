import {
  APIGatewayProxyEvent,
  APIGatewayProxyStructuredResultV2,
  Context,
} from "aws-lambda";

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyStructuredResultV2> => {
  console.log("EVENT: \n" + JSON.stringify(event, null, 2));
  console.log(
    "COGNITO USER SUB: \n" + JSON.stringify(context.identity, null, 2)
  );
  return {
    statusCode: 200,
    body: "Success!",
  };
};
