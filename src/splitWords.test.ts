import { describe, expect, it } from "@jest/globals";
import { splitWords } from "./splitWords.js";

describe("splitWords", () => {
  it.each([
    { name: "fooBar", expected: ["foo", "Bar"] },
    {
      name: "legacyRawAuthBumpRequirements",
      expected: ["legacy", "Raw", "Auth", "Bump", "Requirements"],
    },
    {
      name: "LegacyRawAuthBumpRequirements",
      expected: ["Legacy", "Raw", "Auth", "Bump", "Requirements"],
    },
  ])("$name $expected", ({ name, expected }) => {
    expect(splitWords(name)).toEqual(expected);
  });
});
