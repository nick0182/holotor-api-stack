import { Payload } from "../models/Payload";
import { DatabaseService } from "../services/DatabaseService";

const databaseService = new DatabaseService();

export const handler = async (
  event: Payload
): Promise<void> => {
  const payloadString = JSON.stringify(event, null, 2);
  console.log("Payload:\n" + payloadString);
  const videoId = JSON.parse(event.body).videoId;
  await databaseService.storeBonusVideo(videoId);
};