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
import { DatabaseService } from "../../src/services/DatabaseService";
import { UserVideo } from "../../src/models/UserVideo";
import { getEpochMillisBeforeDay } from "../../src/utils/Utils";
import { Video } from "../../src/models/Video";

const dbClient = new DynamoDBClient(clientConfig);

const weekAgoTimestampMillis: string = getEpochMillisBeforeDay(7).toString();

let databaseService: DatabaseService;

beforeAll(() => {
  databaseService = new DatabaseService(dbClient);
});

describe("Database service tests", () => {
  describe("Test has last video by time after", () => {
    const table: Table = "user-bonus-videos";

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
          getEpochMillisBeforeDay(8).toString()
        ).toRecord(),
        table
      );
      await putItem(
        new UserVideo(
          mockUserId2,
          getEpochMillisBeforeDay(3).toString()
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
          getEpochMillisBeforeDay(6).toString()
        ).toRecord(),
        table
      );
      await putItem(
        new UserVideo(
          mockUserId2,
          getEpochMillisBeforeDay(9).toString()
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

      await expect(databaseService.readBonusVideo()).resolves.toBe(undefined);

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
      ).resolves.toBe(undefined);

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
      ).resolves.toBe(undefined);

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
});

function createTable(table: Table) {
  return expect(
    dbClient.send(createTableCommands[table])
  ).resolves.toMatchObject(successResult);
}

function deleteTable(table: Table) {
  return expect(
    dbClient.send(deleteTableCommands[table])
  ).resolves.toMatchObject(successResult);
}

function putItem(entry: Record<string, AttributeValue>, table: Table) {
  const putItemCommand = new PutItemCommand({
    TableName: tableNames[table],
    Item: entry,
  });
  return expect(dbClient.send(putItemCommand)).resolves.toMatchObject(
    successResult
  );
}
