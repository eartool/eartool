import { Node, SyntaxKind } from "ts-morph";
import type { PackageContext } from "../workspace/PackageContext.js";
import type { FilePath } from "../FilePath.js";
import { getPossibleFileLocations } from "../getPossibleFileLocations.js";
import { getSimplifiedNodeInfoAsString } from "./getSimplifiedNodeInfo.js";

export interface Metadata {
  reexports: Map<string, { originFile: string; exportName: string; isType: boolean }>; // local name to exported name
  imports: Map<string, { originFile: FilePath; isType: boolean; localName: string }>;
  exports: Map<string, { type: "type" | "concrete" | "both" }>;
}

export const createEmptyMetadata = (): Metadata => ({
  reexports: new Map(),
  imports: new Map(),
  exports: new Map(),
});

export function getAllImportsAndExports(ctx: PackageContext) {
  const ret = new Map<FilePath, Metadata>();

  for (const sf of ctx.project.getSourceFiles()) {
    const metadata = createEmptyMetadata();
    ret.set(sf.getFilePath(), metadata);

    for (const importDecl of sf.getImportDeclarations()) {
      for (const importSpecifier of importDecl.getNamedImports()) {
        mapGetOrInitialize(metadata.imports, importSpecifier.getName(), () => ({
          isType: importSpecifier.isTypeOnly() || importDecl.isTypeOnly(),
          localName: importSpecifier.getAliasNode()?.getText() ?? importSpecifier.getName(),
          originFile: getPossibleFileLocations(ctx, importDecl)
            .map((f) => ctx.project.getSourceFile(f))
            .filter((a) => a)[0]
            ?.getFilePath() as FilePath,
        }));
      }
      if (importDecl.getDefaultImport()) {
        mapGetOrInitialize(metadata.imports, "default", () => ({
          isType: importDecl.isTypeOnly(),
          localName: importDecl.getDefaultImport()!.getText(),
          originFile: getPossibleFileLocations(ctx, importDecl)
            .map((f) => ctx.project.getSourceFile(f))
            .filter((a) => a)[0]
            ?.getFilePath() as FilePath,
        }));
      }
    }

    for (const exportedSymbol of [...sf.getExportSymbols()]) {
      for (const decl of exportedSymbol.getDeclarations()) {
        if (decl.isKind(SyntaxKind.ExportAssignment)) {
          mapGetOrInitialize(metadata.exports, "default", () => ({
            type: "concrete" as const, // I dont think we can assume this :/
          }));
        } else if (decl.isKind(SyntaxKind.ExportSpecifier)) {
          // re-export case!
          mapGetOrInitialize(metadata.reexports, decl.getName(), () => ({
            isType: decl.isTypeOnly() || decl.getExportDeclaration().isTypeOnly(),
            exportName: decl.getAliasNode()?.getText() ?? decl.getName(),
            originFile: getPossibleFileLocations(ctx, decl.getParent().getParent())
              .map((f) => ctx.project.getSourceFile(f))
              .filter((a) => a)[0]
              ?.getFilePath() as FilePath,
          }));
        } else if (!Node.isReferenceFindable(decl)) {
          throw new Error("What is this? " + getSimplifiedNodeInfoAsString(decl));
        } else if (
          decl.isKind(SyntaxKind.FunctionDeclaration) ||
          decl.isKind(SyntaxKind.VariableDeclaration) ||
          decl.isKind(SyntaxKind.TypeAliasDeclaration) ||
          decl.isKind(SyntaxKind.InterfaceDeclaration)
        ) {
          const expectedType =
            decl.isKind(SyntaxKind.FunctionDeclaration) ||
            decl.isKind(SyntaxKind.VariableDeclaration)
              ? "concrete"
              : "type";
          if (decl.isExported()) {
            const foo = mapGetOrInitialize(
              metadata.exports,
              decl.isDefaultExport() ? "default" : decl.getName()!,
              () =>
                ({
                  type: expectedType,
                  // exportName: decl.getAliasNode()?.getText() ?? decl.getName()
                } as const)
            );

            if (foo.type !== expectedType) foo.type = "both";
          }
        }
      }
    }
  }
  return ret;
}

export function mapGetOrInitialize<M extends Map<any, any>>(
  map: M,
  key: M extends Map<infer K, any> ? K : never,
  makeNew: () => M extends Map<any, infer V> ? V : never
) {
  if (map.has(key)) {
    return map.get(key)!;
  }

  const q = makeNew();
  map.set(key, q);
  return q;
}
