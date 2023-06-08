import { describe, it, expect } from "@jest/globals";
import { TestBuilder } from "./TestBuilder.js";
import { accumulateRenamesForImportedIdentifier } from "./accumulateRenamesForImportedIdentifier.js";
import { SyntaxKind } from "ts-morph";

describe(accumulateRenamesForImportedIdentifier, () => {
  it("renames a named import module specifier ", () => {
    const { output } = new TestBuilder()
      .addFile(
        "/foo.ts",
        `
          import {bar} from "bar";
          doStuff(bar);
      `
      )
      .performWork(({ replacements, files }) => {
        const node = files
          .get("/foo.ts")!
          .getStatementByKindOrThrow(SyntaxKind.ImportDeclaration)
          .getNamedImports()
          .find((a) => a.getName() == "bar")!;

        accumulateRenamesForImportedIdentifier(
          node.getAliasNode() ?? node.getNameNode(),
          [{ from: ["bar"], toFileOrModule: "baz" }],
          replacements
        );
      })
      .build();

    expect(output).toMatchInlineSnapshot(`
      "
      //
      // </foo.ts>
      //

      import { bar } from "baz";
      doStuff(bar);


      //
      // <//foo.ts>
      //

      "
    `);
    //
  });

  it("renames a default import module specifier ", () => {
    const { output } = new TestBuilder()
      .addFile(
        "/foo.ts",
        `
          import bar from "bar";
          doStuff(bar);
      `
      )
      .performWork(({ replacements, files }) => {
        const node = files
          .get("/foo.ts")!
          .getStatementByKindOrThrow(SyntaxKind.ImportDeclaration)
          .getDefaultImport();
        accumulateRenamesForImportedIdentifier(
          node!,
          [{ from: ["bar"], toFileOrModule: "baz" }],
          replacements
        );
      })
      .build();

    expect(output).toMatchInlineSnapshot(`
      "
      //
      // </foo.ts>
      //

      import bar from "baz";
      doStuff(bar);


      //
      // <//foo.ts>
      //

      "
    `);
    //
  });

  it("renames a namespace import module specifier ", () => {
    const { output } = new TestBuilder()
      .addFile(
        "/foo.ts",
        `
          import * as bar from "bar";
          doStuff(bar);
      `
      )
      .performWork(({ replacements, files }) => {
        const node = files
          .get("/foo.ts")!
          .getStatementByKindOrThrow(SyntaxKind.ImportDeclaration)
          .getNamespaceImport();

        accumulateRenamesForImportedIdentifier(
          node!,
          [{ from: ["bar"], toFileOrModule: "baz" }],
          replacements
        );
      })
      .build();

    expect(output).toMatchInlineSnapshot(`
      "
      //
      // </foo.ts>
      //

      import * as bar from "baz";
      doStuff(bar);


      //
      // <//foo.ts>
      //

      "
    `);
    //
  });
});
