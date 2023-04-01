import { expect, test } from "@jest/globals";
import {
  clientConfig,
  createTableCommand,
  deleteTableCommand,
  mockUserId1,
  mockUserId2,
  successResult,
  tableName,
} from "./constants";
import {
  DynamoDBClient,
  PutItemCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";
import { DatabaseService } from "../../src/services/DatabaseService";
import { UserVideos } from "../../src/models/UserVideos";
import { getEpochMillisBeforeDay } from "../../src/utils/Utils";

const dbClient = new DynamoDBClient(clientConfig);

const weekAgoTimestampMillis: string = getEpochMillisBeforeDay(7).toString();

let databaseService: DatabaseService;

beforeAll(() => {
  databaseService = new DatabaseService(dbClient);
});

describe("Test has last video by time after", () => {
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

    await createTable();

    // ------------------------------------ Assert ----------------------------------------

    await expect(
      databaseService.hasLastVideoByTimeAfter(
        mockUserId1,
        weekAgoTimestampMillis
      )
    ).resolves.toBe(false);

    // ------------------------------------ Cleanup ----------------------------------------

    await deleteTable();
  });

  test("Should return false when user doesn't have last video by time after week", async () => {
    // ------------------------------------ Arrange -----------------------------------------

    await createTable();
    await putItem(
      new UserVideos(mockUserId1, getEpochMillisBeforeDay(8).toString())
    );
    await putItem(
      new UserVideos(mockUserId2, getEpochMillisBeforeDay(3).toString())
    );

    // ------------------------------------ Assert ----------------------------------------

    await expect(
      databaseService.hasLastVideoByTimeAfter(
        mockUserId1,
        weekAgoTimestampMillis
      )
    ).resolves.toBe(false);

    // ------------------------------------ Cleanup ----------------------------------------

    await deleteTable();
  });

  test("Should return true when user has last video by time after week", async () => {
    // ------------------------------------ Arrange -----------------------------------------

    await createTable();
    await putItem(
      new UserVideos(mockUserId1, getEpochMillisBeforeDay(6).toString())
    );
    await putItem(
      new UserVideos(mockUserId2, getEpochMillisBeforeDay(9).toString())
    );

    // ------------------------------------ Assert ----------------------------------------

    await expect(
      databaseService.hasLastVideoByTimeAfter(
        mockUserId1,
        weekAgoTimestampMillis
      )
    ).resolves.toBe(true);

    // ------------------------------------ Cleanup ----------------------------------------

    await deleteTable();
  });
});

function createTable() {
  return expect(dbClient.send(createTableCommand)).resolves.toMatchObject(
    successResult
  );
}

function deleteTable() {
  return expect(dbClient.send(deleteTableCommand)).resolves.toMatchObject(
    successResult
  );
}

function putItem(userVideos: UserVideos) {
  const putItemCommand = new PutItemCommand({
    TableName: tableName,
    Item: userVideos.toRecord(),
  });
  return expect(dbClient.send(putItemCommand)).resolves.toMatchObject(
    successResult
  );
}
