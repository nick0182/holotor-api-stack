import {
  CreateBucketCommand,
  DeleteBucketCommand, DeleteObjectCommand, HeadObjectCommand,
  PutObjectCommand,
  S3ClientConfig,
} from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

export const clientConfig: S3ClientConfig = {
  endpoint: "http://s3.localhost.localstack.cloud:4566",
  region: "us-east-1",
};

export const userId = "userId";

export const videoId = "videoId";

const bonusVideosBucket = `${process.env.ENVIRONMENT}-holotor-bonus-videos`;

const userVideosBucket = `${process.env.ENVIRONMENT}-holotor-users`;

const userVideoKey = `${userId}/videos/${videoId}`

const videoNameMetadata: Record<string, string> = {
  "x-amz-meta-holotor-bonus-video-name": "test video.mp4"
}

const videoContentType = "video/mp4";

export const successResult = {
  $metadata: {
    httpStatusCode: 200,
  },
};

export const noContentResult = {
  $metadata: {
    httpStatusCode: 204,
  },
};

export const bonusVideoCopiedToUserResult = {
  Metadata: videoNameMetadata,
  ContentType: videoContentType,
}

export const createBonusVideosBucketCommand: CreateBucketCommand =
  new CreateBucketCommand({
    Bucket: bonusVideosBucket,
  });

export const createUserVideosBucketCommand: CreateBucketCommand =
  new CreateBucketCommand({
    Bucket: userVideosBucket,
  });

export const deleteBonusVideosBucketCommand: DeleteBucketCommand =
  new DeleteBucketCommand({
    Bucket: bonusVideosBucket,
  });

export const deleteUserVideosBucketCommand: DeleteBucketCommand =
  new DeleteBucketCommand({
    Bucket: userVideosBucket,
  });

export const putBonusVideoCommand: PutObjectCommand = new PutObjectCommand({
  Bucket: bonusVideosBucket,
  Key: videoId,
  Metadata: videoNameMetadata,
  ContentType: videoContentType,
  Body: fs.readFileSync(path.join(__dirname, "../../resources/s3/test video.mp4"))
});

export const deleteBonusVideoCommand: DeleteObjectCommand =
  new DeleteObjectCommand({
    Bucket: bonusVideosBucket,
    Key: videoId,
  });

export const deleteUserVideoCommand: DeleteObjectCommand =
  new DeleteObjectCommand({
    Bucket: userVideosBucket,
    Key: userVideoKey,
  });

export const headUserVideoCommand: HeadObjectCommand =
  new HeadObjectCommand({
    Bucket: userVideosBucket,
    Key:userVideoKey
  });