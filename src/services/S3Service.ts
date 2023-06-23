import {
  CopyObjectCommand,
  CopyObjectCommandOutput,
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

const environment = process.env.ENVIRONMENT as string;

const bonusVideosBucket = `${environment}-holotor-bonus-videos`;

const userBonusVideosBucket = `${environment}-holotor-users`;

export class S3Service {
  constructor(private readonly s3Client: S3Client = new S3Client({})) {}

  async copyBonusVideoToUser(videoId: string, userId: string): Promise<void> {
    console.log(
      `Copying bonus video to user; videoId: ${videoId}, userId: ${userId}`
    );
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

  async deleteUserBonusVideo(videoId: string, userId: string): Promise<void> {
    console.log(
      `Deleting user's bonus video; videoId: ${videoId}, userId: ${userId}`
    );
    return this.s3Client
      .send(
        new DeleteObjectCommand({
          Bucket: userBonusVideosBucket,
          Key: `${userId}/videos/${videoId}`,
        })
      )
      .then(
        (res: DeleteObjectCommandOutput) =>
          console.log(
            `Delete user's bonus video response: ${JSON.stringify(res)}`
          ),
        (error: S3ServiceException) => {
          console.error(
            `Error deleting user's bonus video: ${error.message}`
          );
          throw error;
        }
      );
  }
}