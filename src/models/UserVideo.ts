import { AttributeValue } from "@aws-sdk/client-dynamodb";

export class UserVideo {
  private readonly user_id: AttributeValue.SMember;
  private readonly get_video_ts: AttributeValue.NMember;
  private readonly video_id: AttributeValue.SMember;
  private readonly video_name?: AttributeValue.SMember;

  constructor(
    user_id: string,
    get_video_ts: string,
    video_id: string,
    video_name?: string
  ) {
    this.user_id = { S: user_id };
    this.get_video_ts = { N: get_video_ts };
    this.video_id = { S: video_id };
    this.video_name = video_name !== undefined ? { S: video_name } : undefined;
  }

  toRecord(): Record<string, AttributeValue> {
    const record: Record<string, AttributeValue> = {};
    record["user_id"] = this.user_id;
    record["get_video_ts"] = this.get_video_ts;
    record["video_id"] = this.video_id;
    if (this.video_name !== undefined) {
      record["video_name"] = this.video_name;
    }
    return record;
  }
}