import { AttributeValue } from "@aws-sdk/client-dynamodb";

export class UserVideo {
  private readonly user_id: AttributeValue.SMember;
  private readonly video_retrieval_ts: AttributeValue.NMember;
  private readonly video_id?: AttributeValue.SMember;
  private readonly video_name?: AttributeValue.SMember;

  constructor(
    user_id: string,
    video_retrieval_ts: string,
    video_id?: string,
    video_name?: string
  ) {
    this.user_id = { S: user_id };
    this.video_retrieval_ts = { N: video_retrieval_ts };
    this.video_id = video_id !== undefined ? { S: video_id } : undefined;
    this.video_name = video_name !== undefined ? { S: video_name } : undefined;
  }

  toRecord(): Record<string, AttributeValue> {
    const record: Record<string, AttributeValue> = {};
    record["user_id"] = this.user_id;
    record["video_retrieval_ts"] = this.video_retrieval_ts;
    if (this.video_id !== undefined) {
      record["video_id"] = this.video_id;
    }
    if (this.video_name !== undefined) {
      record["video_name"] = this.video_name;
    }
    return record;
  }
}
