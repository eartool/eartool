import { describe, expect, it } from "@jest/globals";
import { format } from "prettier";
import { Project } from "ts-morph";
import { processProject } from "./processProject.js";
import { processFile } from "./processFile.js";
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
    },
    {
        name: "Props",
        packageName: "FooComponent",
        expectedName: "FooComponentProps"
    },
    {
        name: "OwnProps",
        packageName: "FooComponent",
        expectedName: "FooComponentOwnProps"
    },
    {
        name: "StateProps",
        packageName: "FooComponent",
        expectedName: "FooComponentStateProps"
    },
  ])("$packageName.$name => $expectedName", ({name, packageName, expectedName}) => {
    expect(getNewName(name, packageName)).toEqual(expectedName);
  });
});
