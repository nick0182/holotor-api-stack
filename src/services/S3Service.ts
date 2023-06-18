import {
  CopyObjectCommand,
  CopyObjectCommandOutput,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

const environment = process.env.ENVIRONMENT as string;

export class S3Service {
  constructor(private readonly s3Client: S3Client = new S3Client({})) {}

  async copyBonusVideoToUser(videoId: string, userId: string): Promise<void> {
    console.log(
      `Copying bonus video to user; videoId: ${videoId}, userId: ${userId}`
    );
    const bonusVideosBucket = `${environment}-holotor-bonus-videos`;
    const userBonusVideosBucket = `${environment}-holotor-users`;
    return this.s3Client
      .send(
        new CopyObjectCommand({
          Bucket: userBonusVideosBucket,
          CopySource: `${bonusVideosBucket}/${videoId}`,
          Key: `${userId}/videos/${videoId}`,
          MetadataDirective: "COPY",
          TaggingDirective: "COPY",
          ContentType: "video/mp4",
        })
      )
      .then(
        (res: CopyObjectCommandOutput) =>
          console.log(
            `Copy bonus video to user response: ${JSON.stringify(res)}`
          ),
        (error: S3ServiceException) => {
          console.error(`Error copying bonus video to user: ${error.message}`);
          throw error;
        }
      );
  }
}