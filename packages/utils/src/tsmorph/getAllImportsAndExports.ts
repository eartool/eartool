import * as Assert from "node:assert/strict";
import type {
  FunctionDeclaration,
  InterfaceDeclaration,
  SourceFile,
  TypeAliasDeclaration,
  VariableDeclaration,
} from "ts-morph";
import { SyntaxKind, ts } from "ts-morph";
import type { PackageContext } from "../workspace/PackageContext.js";
import type { FilePath } from "../FilePath.js";
import { weakMemo } from "../weakMemo.js";
import { findFileLocationForImportExport } from "./findFileLocationForImportExport.js";

// Everything you export is either:
//   - A re-export
//   - An aliased export

interface Export {
  type: "type" | "concrete" | "both";
  originFile: FilePath;
  name: string;
  via?: never;
  targetName?: never;
}

interface ExportAlias {
  type: "alias";
  isType: boolean;
  via?: [string, FilePath][];
  originFile: FilePath;
  targetName: string;
  name: string;
  indirect: boolean;
}

export interface Metadata {
  filePath: FilePath;
  /**@deprecated */
  reexports: Map<string, { originFile?: FilePath; exportName: string[]; isType: boolean }>; // local name to exported name
  imports: Map<string, { originFile?: FilePath; isType: boolean; localName: string }>;
  exports: Map<string, Export | ExportAlias>;
  reexportStars: Array<{ originFile: FilePath; as?: string }>;
}

export const createEmptyMetadata = (filePath: FilePath): Metadata => ({
  filePath,
  reexports: new Map(),
  imports: new Map(),
  exports: new Map(),
  reexportStars: [],
  // resolvedExports: [],
});
export const getAllImportsAndExports = weakMemo(getAllImportsAndExportsPrivate);

function getAllImportsAndExportsPrivate(ctx: PackageContext) {
  const ret = new Map<FilePath, Metadata>();

  for (const sf of ctx.project.getSourceFiles()) {
    calculateMetadataForSf(ctx, sf, ret);
  }

  return ret;
}

function calculateMetadataForSf(ctx: PackageContext, sf: SourceFile, ret: Map<FilePath, Metadata>) {
  if (ret.has(sf.getFilePath())) return;
  const metadata = createEmptyMetadata(sf.getFilePath());
  ret.set(sf.getFilePath(), metadata);

  for (const importDecl of sf.getImportDeclarations()) {
    for (const importSpecifier of importDecl.getNamedImports()) {
      Assert.ok(metadata.imports.has(importSpecifier.getName()) === false);
      metadata.imports.set(importSpecifier.getName(), {
        isType: importSpecifier.isTypeOnly() || importDecl.isTypeOnly(),
        localName: importSpecifier.getAliasNode()?.getText() ?? importSpecifier.getName(),
        originFile: findFileLocationForImportExport(ctx, importDecl),
      });
    }
    if (importDecl.getDefaultImport()) {
      Assert.ok(metadata.imports.has("default") === false);
      metadata.imports.set("default", {
        isType: importDecl.isTypeOnly(),
        localName: importDecl.getDefaultImport()!.getText(),
        originFile: findFileLocationForImportExport(ctx, importDecl),
      });
    }
  }

  for (const childNode of sf.getChildSyntaxListOrThrow().getChildren()) {
    if (childNode.isKind(SyntaxKind.ExportAssignment)) {
      Assert.ok(metadata.exports.has("default") === false);
      metadata.exports.set("default", {
        type: "concrete",
        name: "default",
        originFile: sf.getFilePath(),
      });
    } else if (childNode.isKind(SyntaxKind.ExportDeclaration)) {
      const originFile = findFileLocationForImportExport(ctx, childNode);
      if (!originFile) continue; // export {}; case

      if (!ret.has(originFile)) {
        calculateMetadataForSf(ctx, sf.getProject().getSourceFileOrThrow(originFile), ret);
      }

      for (const namedExport of childNode.getNamedExports()) {
        // re-export case!
        Assert.ok(metadata.exports.has(namedExport.getName()) === false);
        const localName = namedExport.getAliasNode()?.getText() ?? namedExport.getName();
        metadata.exports.set(localName, {
          type: "alias",
          name: localName,
          originFile,
          isType: namedExport.isTypeOnly() || namedExport.getExportDeclaration().isTypeOnly(),
          targetName: namedExport.getName(),
          indirect: false,
        });

        // leave this in so mvoe files keeps working
        metadata.reexports.set(namedExport.getName(), {
          isType: namedExport.isTypeOnly() || namedExport.getExportDeclaration().isTypeOnly(),
          exportName: [namedExport.getAliasNode()?.getText() ?? namedExport.getName()],
          originFile: findFileLocationForImportExport(ctx, namedExport.getParent().getParent()),
        });
      }

      if (childNode.isNamespaceExport()) {
        const alias = childNode.getNamespaceExport()?.getName();

        for (const e of ret.get(originFile)!.exports.values()) {
          const name = alias ? `${alias}.${e.name}` : e.name;
          metadata.exports.set(name, {
            type: "alias",
            name: name,
            originFile: e.originFile,
            via: [[e.name, originFile], ...(e.via ?? [])],
            isType: childNode.isTypeOnly(),
            targetName: e.targetName ?? e.name,
            indirect: true,
          });
        }

        metadata.reexportStars.push({
          originFile,
          as: alias,
        });
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
    const name = isDefaultExport ? "default" : decl.getName()!;
    const entry: Export | ExportAlias = metadata.exports.get(name) ?? {
      type: expectedType,
      name,
      originFile: decl.getSourceFile().getFilePath(),
    };

    if (entry.type !== expectedType) entry.type = "both";
    metadata.exports.set(name, entry);
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
