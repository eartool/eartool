import { describe, expect, it } from "@jest/globals";
import { getNewName } from "./getNewName.js";

describe("getNewName", () => {
  it.each([
    {
      name: "Bar",
      namespaceName: "Foo",
      expected: { localName: "BarForFoo", importName: "BarForFoo" },
    },
    {
      name: "bar",
      namespaceName: "Foo",
      expected: { localName: "barForFoo", importName: "barForFoo" },
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
    {
      name: "TEAM_KEY",
      namespaceName: "SecurityPrincipalKeys",
      expected: {
        localName: "TEAM_SECURITY_PRINCIPAL_KEY",
        importName: "TEAM_SECURITY_PRINCIPAL_KEY",
      },
    },
    {
      name: "get",
      namespaceName: "Foo",
      expected: {
        localName: "getFoo",
        importName: "getFoo",
      },
    },
    {
      name: "of",
      namespaceName: "Foo",
      expected: {
        localName: "newFoo",
        importName: "newFoo",
      },
    },
    {
      name: "Args",
      namespaceName: "useFoo",
      expected: {
        localName: "Args",
        importName: "UseFooArgs",
      },
    },
    {
      name: "Return",
      namespaceName: "useFoo",
      expected: {
        localName: "Args",
        importName: "UseFooArgs",
      },
    },
  ])("$namespaceName . $name => $expected", ({ name, namespaceName, expected }) => {
    expect(getNewName(name, namespaceName)).toEqual(expected);
  });
});
