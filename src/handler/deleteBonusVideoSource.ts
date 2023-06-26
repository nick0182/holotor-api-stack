import {Payload} from "../models/Payload";
import {APIGatewayProxyStructuredResultV2} from "aws-lambda";
import {S3Service} from "../services/S3Service";

const s3Service: S3Service = new S3Service();

export const handler = async (
  event: Payload
): Promise<APIGatewayProxyStructuredResultV2> => {
  const payloadString = JSON.stringify(event, null, 2);
  console.log("Payload:\n" + payloadString);
  const body = JSON.parse(event.body);
  await s3Service.deleteBonusVideo(body.videoId);
  return {
    statusCode: 200,
    body: event.body,
  };
};