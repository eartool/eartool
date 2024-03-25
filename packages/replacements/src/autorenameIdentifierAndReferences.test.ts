import { describe, it, expect } from "@jest/globals";
import { SyntaxKind } from "ts-morph";
import { TestBuilder } from "./TestBuilder.js";
import { autorenameIdentifierAndReferences } from "./autorenameIdentifierAndReferences.js";

describe(autorenameIdentifierAndReferences, () => {
  it("renames a short hand binding element ", async () => {
    const { output } = await new TestBuilder()
      .addFile(
        "/foo.ts",
        `
          function someFunc({foo, bar}: Opts) {
              doStuff(foo);
          }
      `,
      )
      .performWork(({ replacements, files }) => {
        const funcDecl = files
          .get("/foo.ts")!
          .getStatementByKindOrThrow(SyntaxKind.FunctionDeclaration);

        const q = funcDecl
          .getStatementByKindOrThrow(SyntaxKind.ExpressionStatement)
          .getExpressionIfKindOrThrow(SyntaxKind.CallExpression)
          .getArguments()[0]
          .asKindOrThrow(SyntaxKind.Identifier);

        autorenameIdentifierAndReferences(replacements, q, funcDecl, new Set());
      })
      .build();

    expect(output).toMatchInlineSnapshot(`
      "
      //
      // </foo.ts>
      //

      function someFunc({ foo: foo0, bar }: Opts) {
        doStuff(foo0);
      }


      //
      // <//foo.ts>
      //

      "
    `);
    //
  });

  it("renames a long binding element ", async () => {
    const { output } = await new TestBuilder()
      .addFile(
        "/foo.ts",
        `
          function someFunc({foo: moo, bar}: Opts) {
              doStuff(moo);
          }
      `,
      )
      .performWork(({ replacements, files }) => {
        const funcDecl = files
          .get("/foo.ts")!
          .getStatementByKindOrThrow(SyntaxKind.FunctionDeclaration);

        const q = funcDecl
          .getStatementByKindOrThrow(SyntaxKind.ExpressionStatement)
          .getExpressionIfKindOrThrow(SyntaxKind.CallExpression)
          .getArguments()[0]
          .asKindOrThrow(SyntaxKind.Identifier);

        autorenameIdentifierAndReferences(replacements, q, funcDecl, new Set("moo"));
      })
      .build();

    expect(output).toMatchInlineSnapshot(`
      "
      //
      // </foo.ts>
      //

      function someFunc({ foo: moo0, bar }: Opts) {
        doStuff(moo0);
      }


      //
      // <//foo.ts>
      //

      "
    `);
    //
  });

  it("renames a named import ", async () => {
    const { output } = await new TestBuilder()
      .addFile(
        "/foo.ts",
        `
          import {Bar} from "./bar";

          doStuff(Bar);
      `,
      )
      .performWork(({ replacements, files }) => {
        const sf = files.get("/foo.ts")!;

        const callExpression = sf
          .getStatementByKindOrThrow(SyntaxKind.ExpressionStatement)
          .getExpressionIfKindOrThrow(SyntaxKind.CallExpression);
        const q = callExpression.getArguments()[0].asKindOrThrow(SyntaxKind.Identifier);

        autorenameIdentifierAndReferences(replacements, q, sf, new Set("Bar"));
      })
      .build();

    expect(output).toMatchInlineSnapshot(`
      "
      //
      // </foo.ts>
      //

      import { Bar as Bar0 } from "./bar";

      doStuff(Bar0);


      //
      // <//foo.ts>
      //

      "
    `);
    //
  });

  it("renames a default import ", async () => {
    const { output } = await new TestBuilder()
      .addFile(
        "/foo.ts",
        `
          import Bar from "./bar";

          doStuff(Bar);
      `,
      )
      .performWork(({ replacements, files }) => {
        const sf = files.get("/foo.ts")!;

        const callExpression = sf
          .getStatementByKindOrThrow(SyntaxKind.ExpressionStatement)
          .getExpressionIfKindOrThrow(SyntaxKind.CallExpression);
        const q = callExpression.getArguments()[0].asKindOrThrow(SyntaxKind.Identifier);

        autorenameIdentifierAndReferences(replacements, q, sf, new Set("Bar"));
      })
      .build();

    expect(output).toMatchInlineSnapshot(`
      "
      //
      // </foo.ts>
      //

      import Bar0 from "./bar";

      doStuff(Bar0);


      //
      // <//foo.ts>
      //

      "
    `);
    //
  });
});
