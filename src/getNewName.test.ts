import { describe, expect, it } from "@jest/globals";
import { getNewName } from "./getNewName.js";

describe("getNewName", () => {
  it.each([
    {
      name: "Bar",
      packageName: "Foo",
      expected: { localName: "BarOfFoo", importName: "BarOfFoo" },
    },
    {
      name: "bar",
      packageName: "Foo",
      expected: { localName: "barOfFoo", importName: "barOfFoo" },
    },
    {
      name: "FOO",
      packageName: "Pack",
      expected: { localName: "PACK_FOO", importName: "PACK_FOO" },
    },
    {
      name: "Props",
      packageName: "FooComponent",
      expected: { localName: "Props", importName: "FooComponentProps" },
    },
    {
      name: "OwnProps",
      packageName: "FooComponent",
      expected: { localName: "OwnProps", importName: "FooComponentOwnProps" },
    },
    {
      name: "State",
      packageName: "FooComponent",
      expected: { localName: "State", importName: "FooComponentState" },
    },
  ])("$packageName . $name => $expected", ({ name, packageName, expected }) => {
    expect(getNewName(name, packageName)).toEqual(expected);
  });
});
