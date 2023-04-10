import { S3Client } from "@aws-sdk/client-s3";

export class S3Service {
  constructor(private readonly s3Client: S3Client = new S3Client({})) {}

  async getBonusVideoDownloadableLink(): Promise<string | void> {

    return Promise.resolve(undefined);
  }
}