import { Payload } from "../models/Payload";
import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export const handler = async (
  event: Payload
): Promise<APIGatewayProxyStructuredResultV2> => {
  const payloadString = JSON.stringify(event, null, 2);
  console.log("Payload:\n" + payloadString);
  return {
    statusCode: 200,
    body: "Success",
  };
};