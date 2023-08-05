import {
  CopyObjectCommand,
  CopyObjectCommandOutput,
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  GetObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const environment = process.env.ENVIRONMENT as string;

const bonusVideosBucket = `${environment}-holotor-bonus-videos`;

const userBonusVideosBucket = `${environment}-holotor-users`;

export class S3Service {
  constructor(private readonly s3Client: S3Client = new S3Client({region: "me-south-1"})) {}

  async copyBonusVideo(videoId: string, userId: string): Promise<void> {
    console.log(
      `Copying bonus video to user's bucket; videoId: ${videoId}, userId: ${userId}`
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
            `Copy bonus video to user's bucket response: ${JSON.stringify(res)}`
          ),
        (error: S3ServiceException) => {
          console.error(
            `Error copying bonus video to user's bucket: ${error.message}`
          );
          throw error;
        }
      );
  }

  async copyUserBonusVideo(videoId: string, userId: string): Promise<void> {
    console.log(
      `Copying user bonus video to video's bucket; videoId: ${videoId}, userId: ${userId}`
    );
    return this.s3Client
      .send(
        new CopyObjectCommand({
          Bucket: bonusVideosBucket,
          CopySource: `${userBonusVideosBucket}/${userId}/videos/${videoId}`,
          Key: `${videoId}`,
          MetadataDirective: "COPY",
          TaggingDirective: "COPY",
          ContentType: "video/mp4",
        })
      )
      .then(
        (res: CopyObjectCommandOutput) =>
          console.log(
            `Copy user bonus video to video's bucket response: ${JSON.stringify(
              res
            )}`
          ),
        (error: S3ServiceException) => {
          console.error(
            `Error copying user bonus video to video's bucket: ${error.message}`
          );
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
          console.error(`Error deleting user's bonus video: ${error.message}`);
          throw error;
        }
      );
  }

  async deleteBonusVideo(videoId: string): Promise<void> {
    console.log(`Deleting bonus video; videoId: ${videoId}`);
    return this.s3Client
      .send(
        new DeleteObjectCommand({
          Bucket: bonusVideosBucket,
          Key: `${videoId}`,
        })
      )
      .then(
        (res: DeleteObjectCommandOutput) =>
          console.log(`Delete bonus video response: ${JSON.stringify(res)}`),
        (error: S3ServiceException) => {
          console.error(`Error deleting bonus video: ${error.message}`);
          throw error;
        }
      );
  }

  async createPreSignedURL(userId: string, videoId: string): Promise<string> {
    console.log(
      `Creating user bonus video pre-signed url; userId: ${userId}, videoId: ${videoId}`
    );
    const getObjectCommand: GetObjectCommand = new GetObjectCommand({
      Bucket: userBonusVideosBucket,
      Key: `${userId}/videos/${videoId}`,
    });
    return getSignedUrl(this.s3Client, getObjectCommand);
  }
}
