import { expect, test } from "@jest/globals";
import {
  clientConfig,
  createTableCommands,
  deleteTableCommands,
  mockUserId1,
  mockUserId2,
  mockVideoId1,
  mockVideoId2,
  mockVideoId3,
  successResult,
  Table,
  tableNames,
} from "./constants";
import {
  AttributeValue,
  DynamoDBClient,
  PutItemCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import { DatabaseService } from "../../../src/services/DatabaseService";
import { UserVideo } from "../../../src/models/UserVideo";
import { getEpochMillisBeforeDay } from "../../../src/utils/utils";
import { Video } from "../../../src/models/Video";

const dbClient = new DynamoDBClient(clientConfig);

const weekAgoTimestampMillis: string = getEpochMillisBeforeDay(7).toString();

let databaseService: DatabaseService;

beforeAll(() => {
  databaseService = new DatabaseService(dbClient);
});

describe("Database service tests", () => {
  describe("Test has last video by time after", () => {
    const table: Table = "user-bonus-videos";
    const video_id = "video_id";

    test("Should throw exception when there is no existing table", async () => {
      // ------------------------------------ Assert ----------------------------------------

      await expect(
        databaseService.hasLastVideoByTimeAfter(
          mockUserId1,
          weekAgoTimestampMillis
        )
      ).rejects.toThrowError(ResourceNotFoundException);
    });

    test("Should return false when there are no entries in the table", async () => {
      // ------------------------------------ Arrange -----------------------------------------

      await createTable(table);

      // ------------------------------------ Assert ----------------------------------------

      await expect(
        databaseService.hasLastVideoByTimeAfter(
          mockUserId1,
          weekAgoTimestampMillis
        )
      ).resolves.toBe(false);

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteTable(table);
    });

    test("Should return false when user doesn't have last video by time after week", async () => {
      // ------------------------------------ Arrange -----------------------------------------

      await createTable(table);
      await putItem(
        new UserVideo(
          mockUserId1,
          getEpochMillisBeforeDay(8).toString(),
          video_id
        ).toRecord(),
        table
      );
      await putItem(
        new UserVideo(
          mockUserId2,
          getEpochMillisBeforeDay(3).toString(),
          video_id
        ).toRecord(),
        table
      );

      // ------------------------------------ Assert ----------------------------------------

      await expect(
        databaseService.hasLastVideoByTimeAfter(
          mockUserId1,
          weekAgoTimestampMillis
        )
      ).resolves.toBe(false);

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteTable(table);
    });

    test("Should return true when user has last video by time after week", async () => {
      // ------------------------------------ Arrange -----------------------------------------

      await createTable(table);
      await putItem(
        new UserVideo(
          mockUserId1,
          getEpochMillisBeforeDay(6).toString(),
          video_id
        ).toRecord(),
        table
      );
      await putItem(
        new UserVideo(
          mockUserId2,
          getEpochMillisBeforeDay(9).toString(),
          video_id
        ).toRecord(),
        table
      );

      // ------------------------------------ Assert ----------------------------------------

      await expect(
        databaseService.hasLastVideoByTimeAfter(
          mockUserId1,
          weekAgoTimestampMillis
        )
      ).resolves.toBe(true);

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteTable(table);
    });
  });

  describe("Test read bonus video", () => {
    const table: Table = "bonus-videos";

    test("Should throw exception when there is no existing table", async () => {
      // ------------------------------------ Assert ----------------------------------------

      await expect(databaseService.readBonusVideo()).rejects.toThrowError(
        ResourceNotFoundException
      );
    });

    test("should return undefined when table contains no entries", async () => {
      // ------------------------------------ Arrange -----------------------------------------

      await createTable(table);

      // ------------------------------------ Assert ----------------------------------------

      await expect(databaseService.readBonusVideo()).resolves.toBeUndefined();

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteTable(table);
    });

    test("should return any video id when table contains entries", async () => {
      // ------------------------------------ Arrange -----------------------------------------

      await createTable(table);
      await putItem(new Video(mockVideoId1).toRecord(), table);
      await putItem(new Video(mockVideoId2).toRecord(), table);
      await putItem(new Video(mockVideoId3).toRecord(), table);

      // ------------------------------------ Assert ----------------------------------------

      await expect(databaseService.readBonusVideo()).resolves.toEqual(
        expect.stringMatching(
          `(${mockVideoId1}|${mockVideoId2}|${mockVideoId3})`
        )
      );

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteTable(table);
    });
  });

  describe("Test delete bonus video", () => {
    const table: Table = "bonus-videos";

    test("should throw exception when there is no existing table", async () => {
      // ------------------------------------ Assert ----------------------------------------

      await expect(
        databaseService.deleteBonusVideo(mockVideoId1)
      ).rejects.toThrowError(ResourceNotFoundException);
    });

    test("should return undefined when table contains no entries", async () => {
      // ------------------------------------ Arrange -----------------------------------------

      await createTable(table);

      // ------------------------------------ Assert ----------------------------------------

      await expect(
        databaseService.deleteBonusVideo(mockVideoId1)
      ).resolves.toBeUndefined();

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteTable(table);
    });

    test("should return undefined when deleting non-existent entry", async () => {
      // ------------------------------------ Arrange -----------------------------------------

      await createTable(table);
      await putItem(new Video(mockVideoId2).toRecord(), table);

      // ------------------------------------ Assert ----------------------------------------

      await expect(
        databaseService.deleteBonusVideo(mockVideoId1)
      ).resolves.toBeUndefined();

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteTable(table);
    });

    test("should return video id when deleting existing entry", async () => {
      // ------------------------------------ Arrange -----------------------------------------

      await createTable(table);
      await putItem(new Video(mockVideoId1).toRecord(), table);
      await putItem(new Video(mockVideoId2).toRecord(), table);
      await putItem(new Video(mockVideoId3).toRecord(), table);

      // ------------------------------------ Assert ----------------------------------------

      await expect(
        databaseService.deleteBonusVideo(mockVideoId1)
      ).resolves.toBe(mockVideoId1);

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteTable(table);
    });
  });

  describe("Test store bonus video", () => {
    const table: Table = "bonus-videos";

    test("should throw ResourceNotFoundException when there is no existing table", async () => {
      // ------------------------------------ Assert ----------------------------------------

      await expect(
        databaseService.storeBonusVideo(mockVideoId1)
      ).rejects.toThrowError(ResourceNotFoundException);
    });

    test("should succeed when overwriting existing entry", async () => {
      // ------------------------------------ Arrange -----------------------------------------

      await createTable(table);
      await putItem(new Video(mockVideoId1).toRecord(), table);

      // ------------------------------------ Assert ----------------------------------------

      await expect(
        databaseService.storeBonusVideo(mockVideoId1)
      ).resolves.toBeUndefined();

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteTable(table);
    });

    test("should succeed when storing a new entry", async () => {
      // ------------------------------------ Arrange -----------------------------------------

      await createTable(table);

      // ------------------------------------ Assert ----------------------------------------

      await expect(
        databaseService.storeBonusVideo(mockVideoId1)
      ).resolves.toBeUndefined();

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteTable(table);
    });
  });

  describe("Test store user bonus video", () => {
    const table: Table = "user-bonus-videos";

    test("should throw ResourceNotFoundException when there is no existing table", async () => {
      // ------------------------------------ Assert ----------------------------------------

      await expect(
        databaseService.storeUserBonusVideo(
          mockUserId1,
          mockVideoId1,
        )
      ).rejects.toThrowError(ResourceNotFoundException);
    });

    test("should succeed when storing a new entry", async () => {
      // ------------------------------------ Arrange -----------------------------------------

      const oldVideoRetrievalTs = new Date(2017, 11).getTime().toString();
      await createTable(table);
      await putItem(
        new UserVideo(
          mockUserId1,
          oldVideoRetrievalTs,
          mockVideoId1
        ).toRecord(),
        table
      );

      // ------------------------------------ Assert ----------------------------------------

      await expect(
        databaseService.storeUserBonusVideo(
          mockUserId1,
          mockVideoId1,
        )
      ).resolves.toBeUndefined();
      await expect(
        databaseService.hasLastVideoByTimeAfter(
          mockUserId1,
          getEpochMillisBeforeDay(7).toString()
        )
      ).resolves.toBe(true);

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteTable(table);
    });
  });

  describe("Test delete user bonus video", () => {
    const table: Table = "user-bonus-videos";

    test("should throw exception when there is no existing table", async () => {
      // ------------------------------------ Assert ----------------------------------------

      await expect(
        databaseService.deleteUserBonusVideo(mockUserId1, mockVideoId1)
      ).rejects.toThrowError(ResourceNotFoundException);
    });

    test("should succeed when table contains no entries", async () => {
      // ------------------------------------ Arrange -----------------------------------------

      await createTable(table);

      // ------------------------------------ Assert ----------------------------------------

      await expect(
        databaseService.deleteUserBonusVideo(mockUserId1, mockVideoId1)
      ).resolves.toBeUndefined();

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteTable(table);
    });

    test("should succeed when deleting non-existent entry", async () => {
      // ------------------------------------ Arrange -----------------------------------------

      await createTable(table);
      await putItem(new UserVideo(mockUserId1, new Date().getTime().toString(), mockVideoId2).toRecord(), table);

      // ------------------------------------ Assert ----------------------------------------

      await expect(
        databaseService.deleteUserBonusVideo(mockUserId1, mockVideoId1)
      ).resolves.toBeUndefined();

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteTable(table);
    });

    test("should succeed when deleting existing entry", async () => {
      // ------------------------------------ Arrange -----------------------------------------

      await createTable(table);
      await putItem(new UserVideo(mockUserId1, new Date(2017, 11).getTime().toString(), mockVideoId1).toRecord(), table);
      await putItem(new UserVideo(mockUserId1, new Date().getTime().toString(), mockVideoId2).toRecord(), table);

      // ------------------------------------ Assert ----------------------------------------

      await expect(
        databaseService.deleteUserBonusVideo(mockUserId1, mockVideoId2)
      ).resolves.toBeUndefined();
      await expect(
        databaseService.hasLastVideoByTimeAfter(
          mockUserId1,
          getEpochMillisBeforeDay(7).toString()
        )
      ).resolves.toBe(false);

      // ------------------------------------ Cleanup ----------------------------------------

      await deleteTable(table);
    });
  });
});

function createTable(table: Table): Promise<void> {
  return expect(
    dbClient.send(createTableCommands[table])
  ).resolves.toMatchObject(successResult);
}

function deleteTable(table: Table): Promise<void> {
  return expect(
    dbClient.send(deleteTableCommands[table])
  ).resolves.toMatchObject(successResult);
}

function putItem(
  entry: Record<string, AttributeValue>,
  table: Table
): Promise<void> {
  const putItemCommand = new PutItemCommand({
    TableName: tableNames[table],
    Item: entry,
  });
  return expect(dbClient.send(putItemCommand)).resolves.toMatchObject(
    successResult
  );
}
