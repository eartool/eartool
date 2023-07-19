import type {
  ExportSpecifier,
  FunctionDeclaration,
  InterfaceDeclaration,
  NamespaceExport,
  TypeAliasDeclaration,
  VariableDeclaration,
} from "ts-morph";
import { SyntaxKind, ts } from "ts-morph";
import type { PackageContext } from "../workspace/PackageContext.js";
import type { FilePath } from "../FilePath.js";
import { weakMemo } from "../weakMemo.js";
import { findFileLocationForImportExport } from "./findFileLocationForImportExport.js";

export interface Metadata {
  reexports: Map<string, { originFile?: FilePath; exportName: string; isType: boolean }>; // local name to exported name
  imports: Map<string, { originFile?: FilePath; isType: boolean; localName: string }>;
  exports: Map<string, { type: "type" | "concrete" | "both" }>;
}

export const createEmptyMetadata = (): Metadata => ({
  reexports: new Map(),
  imports: new Map(),
  exports: new Map(),
});
export const getAllImportsAndExports = weakMemo(getAllImportsAndExportsPrivate);

function getAllImportsAndExportsPrivate(ctx: PackageContext) {
  const ret = new Map<FilePath, Metadata>();

  for (const sf of ctx.project.getSourceFiles()) {
    const metadata = createEmptyMetadata();
    ret.set(sf.getFilePath(), metadata);

    for (const importDecl of sf.getImportDeclarations()) {
      for (const importSpecifier of importDecl.getNamedImports()) {
        mapGetOrInitialize(metadata.imports, importSpecifier.getName(), () => ({
          isType: importSpecifier.isTypeOnly() || importDecl.isTypeOnly(),
          localName: importSpecifier.getAliasNode()?.getText() ?? importSpecifier.getName(),
          originFile: findFileLocationForImportExport(ctx, importDecl),
        }));
      }
      if (importDecl.getDefaultImport()) {
        mapGetOrInitialize(metadata.imports, "default", () => ({
          isType: importDecl.isTypeOnly(),
          localName: importDecl.getDefaultImport()!.getText(),
          originFile: findFileLocationForImportExport(ctx, importDecl),
        }));
      }
    }

    for (const childNode of sf.getChildSyntaxListOrThrow().getChildren()) {
      if (childNode.isKind(SyntaxKind.ExportAssignment)) {
        handleExportAssignment(metadata);
      } else if (childNode.isKind(SyntaxKind.ExportDeclaration)) {
        for (const namedExport of childNode.getNamedExports()) {
          // re-export case!
          handleExportSpecifier(metadata, namedExport);
        }

        const namespaceExport = childNode.getNamespaceExport();
        if (namespaceExport) {
          handleNamespaceExport(namespaceExport);
          // not doing anything special for this right now i guess...
        }
      } else if (childNode.isKind(SyntaxKind.VariableStatement)) {
        for (const q of childNode.getDeclarations()) {
          handleDeclaration(q, metadata);
        }
      } else if (
        childNode.isKind(SyntaxKind.FunctionDeclaration) ||
        childNode.isKind(SyntaxKind.VariableDeclaration) ||
        childNode.isKind(SyntaxKind.TypeAliasDeclaration) ||
        childNode.isKind(SyntaxKind.InterfaceDeclaration)
      ) {
        handleDeclaration(childNode, metadata);
      } else {
        // console.log(getSimplifiedNodeInfoAsString(decl));
      }
    }
  }
  return ret;

  function handleExportAssignment(metadata: Metadata) {
    mapGetOrInitialize(metadata.exports, "default", () => ({
      type: "concrete" as const,
    }));
  }

  function handleExportSpecifier(metadata: Metadata, namedExport: ExportSpecifier) {
    mapGetOrInitialize(metadata.reexports, namedExport.getName(), () => ({
      isType: namedExport.isTypeOnly() || namedExport.getExportDeclaration().isTypeOnly(),
      exportName: namedExport.getAliasNode()?.getText() ?? namedExport.getName(),
      originFile: findFileLocationForImportExport(ctx, namedExport.getParent().getParent()),
    }));
  }

  function handleNamespaceExport(decl: NamespaceExport) {
    ctx.logger.warn(
      `Skipping over '${decl.getText()}' in file ${decl.getSourceFile().getFilePath()}`
    );
  }

  function handleDeclaration(
    decl: FunctionDeclaration | VariableDeclaration | TypeAliasDeclaration | InterfaceDeclaration,
    metadata: Metadata
  ) {
    const expectedType =
      decl.isKind(SyntaxKind.FunctionDeclaration) || decl.isKind(SyntaxKind.VariableDeclaration)
        ? "concrete"
        : "type";

    const isExported = decl.getCombinedModifierFlags() & ts.ModifierFlags.Export;
    const isDefaultExport = decl.getCombinedModifierFlags() & ts.ModifierFlags.Default;

    if (isExported) {
      const foo = mapGetOrInitialize(
        metadata.exports,
        isDefaultExport ? "default" : decl.getName()!,
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
