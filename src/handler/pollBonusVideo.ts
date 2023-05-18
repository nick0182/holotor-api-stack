import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { Payload } from "../models/Payload";
import { DatabaseService } from "../services/DatabaseService";
import { BonusVideoAlreadyDeletedException } from "../errors/BonusVideoAlreadyDeletedException";

const databaseService = new DatabaseService();

export const handler = async (
  event: Payload
): Promise<APIGatewayProxyStructuredResultV2> => {
  const payloadString = JSON.stringify(event, null, 2);
  console.log("Payload:\n" + payloadString);
  const readBonusVideo = await databaseService.readBonusVideo();
  if (!readBonusVideo) {
    throw new Error("No bonus videos available");
  }
  const deletedBonusVideo = await databaseService.deleteBonusVideo(
    readBonusVideo
  );
  if (!deletedBonusVideo) {
    throw new BonusVideoAlreadyDeletedException(readBonusVideo);
  }
  return {
    statusCode: 200,
    body: JSON.stringify({
      userId: JSON.parse(event.body).userId,
      videoId: readBonusVideo,
    }),
  };
};
