import { S3Client, S3ServiceException } from "@aws-sdk/client-s3";
import {
  bonusVideoCopiedToUserResult,
  clientConfig,
  createBonusVideosBucketCommand,
  createUserVideosBucketCommand,
  deleteBonusVideoCommand,
  deleteBonusVideosBucketCommand,
  deleteUserVideoCommand,
  deleteUserVideosBucketCommand,
  headUserVideoCommand,
  noContentResult,
  putBonusVideoCommand,
  successResult,
  userId,
  videoId,
} from "./constants";
import { S3Service } from "../../../src/services/S3Service";
import { expect, test } from "@jest/globals";

const s3Client = new S3Client(clientConfig);

const s3Service = new S3Service(s3Client);

describe("S3 service test", () => {
  describe("Test copy bonus video to user", () => {
    test("Should throw exception when there is no source bucket", async () => {
      // ------------------------------------ Assert ----------------------------------------

      await expect(
        s3Service.copyBonusVideoToUser(videoId, userId)
      ).rejects.toThrowError(S3ServiceException);
    });

    test("Should throw exception when there is no source object", async () => {
      // ------------------------------------ Arrange ---------------------------------------

      await createBonusVideosBucket();

      // ------------------------------------ Assert ----------------------------------------

      await expect(
        s3Service.copyBonusVideoToUser(videoId, userId)
      ).rejects.toThrowError(S3ServiceException);

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteBonusVideosBucket();
    });

    test("Should throw exception when there is no target bucket", async () => {
      // ------------------------------------ Arrange ---------------------------------------

      await createBonusVideosBucket();
      await putBonusVideo();

      // ------------------------------------ Assert ----------------------------------------

      await expect(
        s3Service.copyBonusVideoToUser(videoId, userId)
      ).rejects.toThrowError(S3ServiceException);

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteBonusVideo();
      await deleteBonusVideosBucket();
    });

    test("Should copy bonus video to user' bucket", async () => {
      // ------------------------------------ Arrange ---------------------------------------

      await createBonusVideosBucket();
      await putBonusVideo();
      await createUserVideosBucket();

      // ------------------------------------ Act -------------------------------------------

      await expect(
        s3Service.copyBonusVideoToUser(videoId, userId)
      ).resolves.toBeUndefined();

      // ------------------------------------ Assert ----------------------------------------

      await checkVideoCopiedToUser();

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteBonusVideo();
      await deleteBonusVideosBucket();
      await deleteUserVideo();
      await deleteUserVideosBucket();
    });
  });
});

async function createBonusVideosBucket(): Promise<void> {
  return expect(
    s3Client.send(createBonusVideosBucketCommand)
  ).resolves.toMatchObject(successResult);
}

async function createUserVideosBucket(): Promise<void> {
  return expect(
    s3Client.send(createUserVideosBucketCommand)
  ).resolves.toMatchObject(successResult);
}

async function deleteBonusVideosBucket(): Promise<void> {
  return expect(
    s3Client.send(deleteBonusVideosBucketCommand)
  ).resolves.toMatchObject(noContentResult);
}

async function deleteUserVideosBucket(): Promise<void> {
  return expect(
    s3Client.send(deleteUserVideosBucketCommand)
  ).resolves.toMatchObject(noContentResult);
}

async function putBonusVideo(): Promise<void> {
  return expect(s3Client.send(putBonusVideoCommand)).resolves.toMatchObject(
    successResult
  );
}

async function deleteBonusVideo(): Promise<void> {
  return expect(s3Client.send(deleteBonusVideoCommand)).resolves.toMatchObject(
    noContentResult
  );
}

async function deleteUserVideo(): Promise<void> {
  return expect(s3Client.send(deleteUserVideoCommand)).resolves.toMatchObject(
    noContentResult
  );
}

async function checkVideoCopiedToUser(): Promise<void> {
  return expect(s3Client.send(headUserVideoCommand)).resolves.toMatchObject(
    bonusVideoCopiedToUserResult
  );
}
