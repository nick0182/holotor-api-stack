import { expect, jest, test } from "@jest/globals";
import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config();

test("Positive scenarios - no auth context - unauthorized response status code", () => {
  const apiGWUrl = process.env.API_GW_URL as string;
  const apiResourcePath = process.env.API_RESOURCE_PATH as string;
  axios({
    method: "POST",
    url: apiGWUrl + apiResourcePath,
  }).catch((error) => {
    expect(error.response.status).toBe(403);
  });
});
