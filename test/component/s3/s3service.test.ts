import { NotFound, S3Client, S3ServiceException } from "@aws-sdk/client-s3";
import {
  bonusVideoCopiedToUserResult,
  clientConfig,
  createBonusVideosBucketCommand,
  createUserBonusVideosBucketCommand,
  deleteBonusVideoCommand,
  deleteBonusVideosBucketCommand,
  deleteUserBonusVideoCommand,
  deleteUserBonusVideosBucketCommand,
  headUserBonusVideoCommand,
  noContentResult,
  putBonusVideoCommand,
  putUserBonusVideoCommand,
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
      await createUserBonusVideosBucket();

      // ------------------------------------ Act -------------------------------------------

      await expect(
        s3Service.copyBonusVideoToUser(videoId, userId)
      ).resolves.toBeUndefined();

      // ------------------------------------ Assert ----------------------------------------

      await checkBonusVideoCopiedToUser();

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteBonusVideo();
      await deleteBonusVideosBucket();
      await deleteUserBonusVideo();
      await deleteUserBonusVideosBucket();
    });
  });

  describe("Test delete user's bonus video", () => {
    test("Should throw exception when there is no bucket", async () => {
      // ------------------------------------ Assert ----------------------------------------

      await expect(
        s3Service.deleteUserBonusVideo(videoId, userId)
      ).rejects.toThrowError(S3ServiceException);
    });

    test("Should succeed when there is no object", async () => {
      // ------------------------------------ Arrange ---------------------------------------

      await createUserBonusVideosBucket();

      // ------------------------------------ Act -------------------------------------------

      await expect(
        s3Service.deleteUserBonusVideo(videoId, userId)
      ).resolves.toBeUndefined();

      // ------------------------------------ Assert ----------------------------------------

      await checkUserBonusVideoDeleted();

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteUserBonusVideosBucket();
    });

    test("Should succeed when there is existing object", async () => {
      // ------------------------------------ Arrange ---------------------------------------

      await createUserBonusVideosBucket();
      await putUserBonusVideo();

      // ------------------------------------ Act -------------------------------------------

      await expect(
        s3Service.deleteUserBonusVideo(videoId, userId)
      ).resolves.toBeUndefined();

      // ------------------------------------ Assert ----------------------------------------

      await checkUserBonusVideoDeleted();

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteUserBonusVideosBucket();
    });
  });
});

async function createBonusVideosBucket(): Promise<void> {
  return expect(
    s3Client.send(createBonusVideosBucketCommand)
  ).resolves.toMatchObject(successResult);
}

async function createUserBonusVideosBucket(): Promise<void> {
  return expect(
    s3Client.send(createUserBonusVideosBucketCommand)
  ).resolves.toMatchObject(successResult);
}

async function putUserBonusVideo(): Promise<void> {
  return expect(s3Client.send(putUserBonusVideoCommand)).resolves.toMatchObject(
    successResult
  );
}

async function deleteBonusVideosBucket(): Promise<void> {
  return expect(
    s3Client.send(deleteBonusVideosBucketCommand)
  ).resolves.toMatchObject(noContentResult);
}

async function deleteUserBonusVideosBucket(): Promise<void> {
  return expect(
    s3Client.send(deleteUserBonusVideosBucketCommand)
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

async function deleteUserBonusVideo(): Promise<void> {
  return expect(s3Client.send(deleteUserBonusVideoCommand)).resolves.toMatchObject(
    noContentResult
  );
}

async function checkBonusVideoCopiedToUser(): Promise<void> {
  return expect(s3Client.send(headUserBonusVideoCommand)).resolves.toMatchObject(
    bonusVideoCopiedToUserResult
  );
}

async function checkUserBonusVideoDeleted(): Promise<void> {
  return expect(s3Client.send(headUserBonusVideoCommand)).rejects.toThrowError(
    NotFound
  );
}
