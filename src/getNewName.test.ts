import { describe, expect, it } from "@jest/globals";
import { format } from "prettier";
import { Project } from "ts-morph";
import { processFile, processProject } from "./go.js";
import { getNewName } from "./getNewName.js";

describe("getNewName", () => {
  it.each([
    {
      name: "Bar",
      packageName: "Foo",
      expectedName: "BarOfFoo",
    },
    {
        name: "bar",
        packageName: "Foo",
        expectedName: "barOfFoo",
      },
    {
        name: "FOO",
        packageName: "Pack",
        expectedName: "PACK_FOO"
    }
  ])("$packageName.$name => $expectedName", ({name, packageName, expectedName}) => {
    expect(getNewName(name, packageName)).toEqual(expectedName);
  });
});
