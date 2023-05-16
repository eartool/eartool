import { describe, expect, it } from "@jest/globals";
import { getNewName } from "./getNewName.js";

describe("getNewName", () => {
  it.each([
    {
      name: "Bar",
      namespaceName: "Foo",
      expected: { localName: "BarOfFoo", importName: "BarOfFoo" },
    },
    {
      name: "bar",
      namespaceName: "Foo",
      expected: { localName: "barOfFoo", importName: "barOfFoo" },
    },
    {
      name: "FOO",
      namespaceName: "Pack",
      expected: { localName: "PACK_FOO", importName: "PACK_FOO" },
    },
    {
      name: "Props",
      namespaceName: "FooComponent",
      expected: { localName: "Props", importName: "FooComponentProps" },
    },
    {
      name: "OwnProps",
      namespaceName: "FooComponent",
      expected: { localName: "OwnProps", importName: "FooComponentOwnProps" },
    },
    {
      name: "State",
      namespaceName: "FooComponent",
      expected: { localName: "State", importName: "FooComponentState" },
    },
    {
      name: "legacyRequirements",
      namespaceName: "RawAuthBumpRequirements",
      expected: {
        localName: "legacyRawAuthBumpRequirements",
        importName: "legacyRawAuthBumpRequirements",
      },
    },
    {
      name: "isV2Requirements",
      namespaceName: "RawAuthBumpRequirements",
      expected: {
        localName: "isV2RawAuthBumpRequirements",
        importName: "isV2RawAuthBumpRequirements",
      },
    },
  ])("$namespaceName . $name => $expected", ({ name, namespaceName, expected }) => {
    expect(getNewName(name, namespaceName)).toEqual(expected);
  });
});
