import { AttributeValue } from "@aws-sdk/client-dynamodb";

export class Video {
  private readonly video_id: AttributeValue.SMember;

  constructor(video_id: string) {
    this.video_id = { S: video_id };
  }

  toRecord(): Record<string, AttributeValue> {
    const record: Record<string, AttributeValue> = {};
    record["video_id"] = this.video_id;
    return record;
  }
}
