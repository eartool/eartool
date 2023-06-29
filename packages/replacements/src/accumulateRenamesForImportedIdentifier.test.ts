import { describe, it, expect } from "@jest/globals";
import { SyntaxKind } from "ts-morph";
import { TestBuilder } from "./TestBuilder.js";
import { accumulateRenamesForImportedIdentifier } from "./accumulateRenamesForImportedIdentifier.js";

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
      .performWork(({ replacements, files, ctx }) => {
        const node = files
          .get("/foo.ts")!
          .getStatementByKindOrThrow(SyntaxKind.ImportDeclaration)
          .getNamedImports()
          .find((a) => a.getName() == "bar")!;

        accumulateRenamesForImportedIdentifier(
          ctx,
          node.getAliasNode() ?? node.getNameNode(),
          [{ from: ["bar"], toFileOrModule: "baz" }],
          replacements,
          false
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

  // it("renames a default import module specifier ", () => {
  //   const { output } = new TestBuilder()
  //     .addFile(
  //       "/foo.ts",
  //       `
  //         import bar from "bar";
  //         doStuff(bar);
  //     `
  //     )
  //     .performWork(({ replacements, files, ctx }) => {
  //       const node = files
  //         .get("/foo.ts")!
  //         .getStatementByKindOrThrow(SyntaxKind.ImportDeclaration)
  //         .getDefaultImport();
  //       accumulateRenamesForImportedIdentifier(
  //         ctx,
  //         node!,
  //         [{ from: ["default"], toFileOrModule: "baz" }],
  //         replacements,
  //         false
  //       );
  //     })
  //     .build();

  //   expect(output).toMatchInlineSnapshot(`
  //     "
  //     //
  //     // </foo.ts>
  //     //

  //     import bar from "baz";
  //     doStuff(bar);

  //     //
  //     // <//foo.ts>
  //     //

  //     "
  //   `);
  //   //
  // });

  // it("renames a namespace import module specifier ", () => {
  //   const { output } = new TestBuilder()
  //     .addFile(
  //       "/foo.ts",
  //       `
  //         import * as bar from "bar";
  //         doStuff(bar);
  //     `
  //     )
  //     .performWork(({ replacements, files, ctx }) => {
  //       const node = files
  //         .get("/foo.ts")!
  //         .getStatementByKindOrThrow(SyntaxKind.ImportDeclaration)
  //         .getNamespaceImport();

  //       accumulateRenamesForImportedIdentifier(
  //         ctx,
  //         node!,
  //         [{ from: ["bar"], toFileOrModule: "baz" }],
  //         replacements,
  //         false
  //       );
  //     })
  //     .build();

  //   expect(output).toMatchInlineSnapshot(`
  //     "
  //     //
  //     // </foo.ts>
  //     //

  //     import * as bar from "baz";
  //     doStuff(bar);

  //     //
  //     // <//foo.ts>
  //     //

  //     "
  //   `);
  //   //
  // });
});
