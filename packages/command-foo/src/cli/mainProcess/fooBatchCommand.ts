/* eslint-disable @typescript-eslint/consistent-type-imports */
import { makeBatchCommand } from "@eartool/batch";
import { dropDtsFiles, getSimplifiedNodeInfoAsString, maybeLoadProject } from "@eartool/utils";
import { Node, Project, Signature, SymbolFlags, SyntaxKind, Type } from "ts-morph";
import type { Logger } from "pino";

export const fooBatchCommand = makeBatchCommand(
  {
    name: "foo",
    description: "foo description",
    options: {
      test: {
        string: true,
      },
    },
    cliMain: async (args) => {
      return {
        workerUrl: new URL(import.meta.url),
        getJobArgs() {
          return {};
        },
        onComplete(jobInfo, extra) {
          // extra.logger.info(extra.result);
        },
        order: "upstreamFirst",
      };
    },
  },
  async () => {
    return {
      default: async ({ packagePath, logger, jobArgs }) => {
        const project = maybeLoadProject(packagePath);
        if (!project) {
          return;
        }

        dropDtsFiles(project);

        // findOwnPropsAssignment(project, logger);

        for (const sf of project.getSourceFiles()) {
          for (const propAccessExpression of sf.getDescendantsOfKind(
            SyntaxKind.PropertyAccessExpression
          )) {
            const name = propAccessExpression.getName();
            if (name != "Props" && name != "OwnProps") {
              continue;
            }

            // only handle simple cases
            const lhs = propAccessExpression.getExpressionIfKind(SyntaxKind.Identifier);
            if (!lhs) continue;
            const decls = lhs.getSymbol()?.getDeclarations() ?? [];

            logger.info(
              "Found some:\n%s",
              decls.map((d) => "   " + getSimplifiedNodeInfoAsString(d)).join("\n")
            );

            if (decls.length != 2) continue;

            for (const d of decls) {
              const callExpression = d
                .asKind(SyntaxKind.VariableDeclaration)
                ?.getInitializerIfKind(SyntaxKind.CallExpression);
              if (!callExpression) continue;

              logger.info("Found return type: %s", callExpression.getReturnType().getText());

              const type = callExpression.getReturnType();

              if (isReactComponent(type, logger)) {
                logger.info(
                  "call sigs: %s",
                  type.getCallSignatures().flatMap((a) => a.getDeclaration().getText())
                );
              }

              // const q = d.getSymbolsInScope(SymbolFlags.TypeLiteral);
              // // q.find(a=>a.getName() == "React");
              // logger.info("huh %s", q.map((a) => a.getName()).join("\n"));

              // logger.info(
              //   "Huh %s",
              //   q
              //     .map(
              //       (a) =>
              //         a.getName() +
              //         " - " +
              //         a
              //           .getExportSymbol()
              //           .getDeclarations()
              //           .map((b) => b.getSourceFile().getFilePath())
              //     )
              //     .join(", ")
              // );
            }
          }
        }
      },
    };
  }
);

// const reactFunctionsThatReturnComponent
function newFunction(d: Node) {
  const callExpression = d
    .asKind(SyntaxKind.VariableDeclaration)
    ?.getInitializerIfKind(SyntaxKind.CallExpression);
  if (!callExpression) return;

  callExpression.getReturnType();

  callExpression.getExpressionIfKind(SyntaxKind.PropertyAccessExpression);
}

function findOwnPropsAssignment(project: Project, logger: Logger) {
  for (const sf of project.getSourceFiles()) {
    for (const identifier of sf.getDescendantsOfKind(SyntaxKind.Identifier)) {
      if (identifier.getText() == "Props") {
        const typeAliasDecl = identifier.getParentIfKind(SyntaxKind.TypeAliasDeclaration);
        if (!typeAliasDecl) continue;
        const typeName = typeAliasDecl
          .getTypeNode()
          ?.asKind(SyntaxKind.TypeReference)
          ?.getTypeName()
          .asKind(SyntaxKind.Identifier)
          ?.getText();
        if (!typeName) continue;

        if (typeName === "OwnProps") {
          logger.info(
            "Found a weird assignment `%s` in %s",
            typeAliasDecl.getText(),
            sf.getSourceFile().getFilePath()
          );
        }
      }
    }
  }
}
// function isReactComponent(type: Type) {
//   type.getAliasSymbol()?.getName()
//   type.getCallSignatures().map(a=>a.)
//   type.getText();
//   if (type.getSymbol().)

//   throw new Error("Function not implemented.");
// }

function isReactComponent(type: Type, logger: Logger) {
  const symbol = type.getAliasSymbol();

  const isFromReactDts = symbol
    ?.getDeclarations()
    .every((a) => a.getSourceFile().getFilePath().includes("@types/react"));
  // logger.info(
  //   "files " +
  //     symbol
  //       ?.getDeclarations()
  //       .map((a) => a.getSourceFile().getFilePath())
  //       .join("\n")
  // );
  // logger.info("alias name: " + symbol?.getName());

  if (isFromReactDts && symbol?.getName() == "MemoExoticComponent") {
    logger.info("Found a react component type so returning true: %s", type.getText());

    logger.info(
      "properties : " +
        type
          .getProperties()
          .map((a) => a.getName())
          .join()
    );
    logger.info(
      "" +
        type
          .getTypeArguments()
          .map((a) => a.getText())
          .join()
    );

    logger.info(
      "aa " +
        type
          .getAliasTypeArguments()
          .map((a) => a.getText())
          .join()
    );

    if (type.getAliasTypeArguments().length == 1) {
      const realFunc = type.getAliasTypeArguments()[0];
      const woot = realFunc.getCallSignatures().every((a) => isReactFunctionSignature(a, logger));
      const returnTypes = realFunc.getCallSignatures().map((a) => a.getReturnType());
      logger.info("mm %s", returnTypes.map((a) => a.getText()).join());
      logger.info("woot " + woot);

      // logger.info(
      //   "type params " +
      //     realFunc
      //       .getCallSignatures()
      //       .map((a) =>
      //         a
      //           .getTypeParameters()
      //           .map((a) => a.getText())
      //           .join(",")
      //       )
      //       .join(":")
      // );

      const q = realFunc
        .getApparentType()
        .getCallSignatures()[0]
        .getParameters()[0]
        .getDeclaredType();
      logger.info("q " + q.getText());

      // const props = realFunc
      //   .getCallSignatures()
      //   .map((a) => (a.getParameters().length == 1 ? a.getParameters()[0]. : undefined));

      // logger.info("props: " + props.map((a) => a?.getName()).join());

      // logger.info("Aparent: " + type.getTypeArguments()[0].getApparentType().getText());
    }

    return true;
  } else if (isFromReactDts) {
    logger.warn("Was from react but unknown type: %s", type.getText());
    return false;
  } else {
    logger.info("call sigs good? " + type.getCallSignatures().every((a) => foo(a, logger)));
  }
}

function isReactFunctionSignature(sig: Signature, logger: Logger) {
  const returnType = sig.getReturnType();

  logger.info("Merp %s", returnType.isUnion());
  logger.info(
    "merp2 %s",
    returnType.getUnionTypes().map((a) => a.getSymbol()?.getName())
  );

  const returnTypesAreGood = (
    returnType.isUnion() ? returnType.getUnionTypes() : [returnType]
  ).every((a) => a.getText() == "JSX.Element" || a.getText() == "null");
  logger.info("returnTypesAregood " + returnTypesAreGood);

  const onlyOneArg = sig.getParameters().length === 1;
  logger.info("only one arg " + onlyOneArg);

  return returnTypesAreGood && onlyOneArg;
}

function foo(sig: Signature, logger: Logger) {
  const returnType = sig.getReturnType();

  logger.info("Merp %s", returnType.isUnion());
  logger.info(
    "merp2 %s",
    returnType.getUnionTypes().map((a) => a.getSymbol()?.getName())
  );

  const returnTypesAreGood = returnType
    .getUnionTypes()
    .every((a) => a.getText() == "ReactElement" || a.getText() == "null");
  logger.info("returnTypesAregood " + returnTypesAreGood);

  const onlyOneArg = sig.getParameters().length === 1;
  logger.info("only one arg " + onlyOneArg);

  return returnTypesAreGood && onlyOneArg;
}
