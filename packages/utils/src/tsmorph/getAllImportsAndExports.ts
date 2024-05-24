import * as Assert from "node:assert/strict";
import * as util from "node:util";
import type {
  FunctionDeclaration,
  InterfaceDeclaration,
  ModuleDeclaration,
  SourceFile,
  TypeAliasDeclaration,
  VariableDeclaration,
} from "ts-morph";
import { SyntaxKind, ts } from "ts-morph";
import type { FilePath } from "../FilePath.js";
import { weakMemo } from "../weakMemo.js";
import type { PackageContext } from "../workspace/PackageContext.js";
import { findFileLocationForImportExport } from "./findFileLocationForImportExport.js";
import { getSimplifiedNodeInfoAsString } from "./getSimplifiedNodeInfo.js";

// Everything you export is either:
//   - A re-export
//   - An aliased export

interface Base {
  targetFile?: FilePath;
  targetName?: string;
  finalDest?: Export | ExportAlias;
  via?: ExportAlias | Export;
}

export interface Export extends Base {
  type: "type" | "concrete" | "both";
  targetFile: FilePath;
  name: string;
  via?: never;
  targetName?: never;
}

export interface ExportAlias extends Base {
  type: "alias";
  isType: boolean;
  targetFile: FilePath;
  targetName: string;
  name: string;
  indirect: boolean;
}

export interface Import extends Base {
  type: "import";
  targetFile?: FilePath;
  moduleSpecifier: string;
  isType: boolean;
  targetName: string;
  name: string;
}

export interface Metadata {
  filePath: FilePath;
  imports: ReadonlyMap<string, Import>;
  exports: ReadonlyMap<string, Export | ExportAlias>;
  reexportStars: ReadonlyArray<{ originFile: FilePath; as?: string }>;
}

export interface MutableMetadata {
  filePath: FilePath;
  imports: Map<string, Import>;
  exports: Map<string, Export | ExportAlias>;
  reexportStars: Array<{ originFile: FilePath; as?: string }>;
}

export function cloneMetadata(metadata: Metadata): MutableMetadata {
  return {
    filePath: metadata.filePath,
    // reexports: new Map(metadata.reexports),
    imports: new Map(metadata.imports),
    exports: new Map(metadata.exports),
    reexportStars: [...metadata.reexportStars],
  };
}

export const createEmptyMetadata = (filePath: FilePath): MutableMetadata => ({
  filePath,
  imports: new Map(),
  exports: new Map(),
  reexportStars: [],
});

export const getAllImportsAndExports = weakMemo(getAllImportsAndExportsPrivate);

function getAllImportsAndExportsPrivate(ctx: PackageContext): ReadonlyMap<FilePath, Metadata> {
  const ret = new Map<FilePath, MutableMetadata>();

  // perform first pass
  for (const sf of ctx.project.getSourceFiles()) {
    calculateMetadataForSf(ctx, sf, ret);
  }

  for (const [, metadata] of ret) {
    for (const [, exportInfo] of metadata.exports) {
      if (exportInfo.type !== "alias") continue;
      populateThrough(ret, exportInfo);
    }
    for (const [, importInfo] of metadata.imports) {
      populateThrough(ret, importInfo);
    }
  }

  ctx.logger.trace(
    "getAllImportsAndExportsPrivate before returning: "
      + util.inspect(ret, { depth: 6, colors: true }),
  );

  return ret;
}

function populateThrough(
  fullMetadata: Map<FilePath, MutableMetadata>,
  info: Import | ExportAlias,
): Export | ExportAlias | undefined {
  if (info.via?.finalDest) return info.via.finalDest;
  if (!info.targetFile) {
    if (info.type === "alias") return info;
    return undefined;
  }

  const target = fullMetadata.get(info.targetFile);
  if (!target) throw new Error("Should have found the target file: " + info.targetFile);

  const targetsExport = target.exports.get(info.targetName ?? info.name);
  if (!targetsExport) {
    throw new Error(`Should have found the target: ${info.targetName} in ${info.targetFile}`);
  }

  info.via = targetsExport;
  if (targetsExport.type !== "alias") return targetsExport;
  const finalDest = populateThrough(fullMetadata, targetsExport);
  if (finalDest) {
    info.finalDest = finalDest;
  }

  return finalDest;
}

function calculateMetadataForSf(
  ctx: PackageContext,
  sf: SourceFile,
  ret: Map<FilePath, MutableMetadata>,
) {
  if (ret.has(sf.getFilePath())) return;
  const metadata = createEmptyMetadata(sf.getFilePath());
  ret.set(sf.getFilePath(), metadata);

  // const logger = ctx.logger.child({ sf: sf.getFilePath(), method: "calculateMetadataForSf" });
  // logger.trace({ sf: sf.getFilePath() }, "calculateMetadataForSf");

  for (const importDecl of sf.getImportDeclarations()) {
    // logger.debug({
    //   code: importDecl.getText(),
    // }, "Processing import");
    // logger.trace(`metadata: ${util.inspect(metadata, { depth: 2 })}`);
    for (const importSpecifier of importDecl.getNamedImports()) {
      // logger.trace(`importSpecifier: ${importSpecifier.getText()}`);
      const localName = importSpecifier.getAliasNode()?.getText() ?? importSpecifier.getName();

      Assert.ok(
        metadata.imports.has(localName) === false,
        `Seems we already have a default export for ${
          getSimplifiedNodeInfoAsString(
            importSpecifier,
          )
        }`,
      );

      metadata.imports.set(localName, {
        type: "import",
        name: localName,
        isType: importSpecifier.isTypeOnly() || importDecl.isTypeOnly(),
        targetName: importSpecifier.getName(),
        targetFile: findFileLocationForImportExport(ctx, importDecl),
        moduleSpecifier: importDecl.getModuleSpecifierValue(),
      });
    }
    if (importDecl.getDefaultImport()) {
      const localName = importDecl.getDefaultImport()!.getText();
      Assert.ok(
        metadata.imports.has(localName) === false,
        `Seems we already have a default export for ${getSimplifiedNodeInfoAsString(importDecl)}`,
      );
      metadata.imports.set(localName, {
        type: "import",
        name: localName,
        isType: importDecl.isTypeOnly(),
        targetName: "default",
        targetFile: findFileLocationForImportExport(ctx, importDecl),
        moduleSpecifier: importDecl.getModuleSpecifierValue(),
      });
    }
  }

  // logger.trace(`metadata after imports: ${util.inspect(metadata, { depth: 2 })}`);
  for (const childNode of sf.getChildSyntaxListOrThrow().getChildren()) {
    // logger.debug({
    //   code: childNode.getText(),
    //   kind: childNode.getKindName(),
    // }, "Processing childNode");
    // logger.trace(`metadata: ${util.inspect(metadata, { depth: 2 })}`);
    if (childNode.isKind(SyntaxKind.ExportAssignment)) {
      Assert.ok(metadata.exports.has("default") === false);
      metadata.exports.set("default", {
        type: "concrete",
        name: "default",
        targetFile: sf.getFilePath(),
      });
    } else if (childNode.isKind(SyntaxKind.ExportDeclaration)) {
      const targetFile = findFileLocationForImportExport(ctx, childNode);
      // logger.trace(`originFile: ${originFile}`);
      if (!targetFile) continue; // export {}; case

      if (!ret.has(targetFile)) {
        calculateMetadataForSf(ctx, sf.getProject().getSourceFileOrThrow(targetFile), ret);
      }

      for (const namedExport of childNode.getNamedExports()) {
        // re-export case!
        const localName = namedExport.getAliasNode()?.getText() ?? namedExport.getName();

        metadata.exports.set(localName, {
          type: "alias",
          name: localName,
          // originFile,
          targetFile,
          isType: namedExport.isTypeOnly() || namedExport.getExportDeclaration().isTypeOnly(),
          targetName: namedExport.getName(),
          indirect: false,
        });
      }

      if (childNode.isNamespaceExport()) {
        const alias = childNode.getNamespaceExport()?.getName();

        for (const e of ret.get(targetFile)!.exports.values()) {
          const name = alias ? `${alias}.${e.name}` : e.name;
          metadata.exports.set(name, {
            type: "alias",
            name: name,
            // originFile: e.originFile,
            targetFile: e.targetFile,
            isType: childNode.isTypeOnly(),
            targetName: e.targetName ?? e.name,
            indirect: true,
          });
        }

        metadata.reexportStars.push({
          originFile: targetFile,
          as: alias,
        });
      }
    } else if (childNode.isKind(SyntaxKind.VariableStatement)) {
      for (const decl of childNode.getDeclarations()) {
        handleDeclaration(decl, metadata);
      }
    } else if (
      childNode.isKind(SyntaxKind.FunctionDeclaration)
      || childNode.isKind(SyntaxKind.VariableDeclaration)
      || childNode.isKind(SyntaxKind.TypeAliasDeclaration)
      || childNode.isKind(SyntaxKind.InterfaceDeclaration)
      || childNode.isKind(SyntaxKind.ModuleDeclaration)
    ) {
      handleDeclaration(childNode, metadata);
    } else {
      // console.log(getSimplifiedNodeInfoAsString(childNode));
    }
  }
  // logger.trace(`metadata after remaining: ${util.inspect(metadata, { depth: 2 })}`);
}

function handleDeclaration(
  decl:
    | FunctionDeclaration
    | VariableDeclaration
    | TypeAliasDeclaration
    | InterfaceDeclaration
    | ModuleDeclaration,
  metadata: MutableMetadata,
) {
  const expectedType = decl.isKind(SyntaxKind.FunctionDeclaration) || decl.isKind(SyntaxKind.VariableDeclaration)
    ? "concrete"
    : "type";

  const isExported = decl.getCombinedModifierFlags() & ts.ModifierFlags.Export;
  const isDefaultExport = decl.getCombinedModifierFlags() & ts.ModifierFlags.Default;

  if (isExported) {
    const name = isDefaultExport ? "default" : decl.getName()!;
    const entry: Export | ExportAlias = metadata.exports.get(name) ?? {
      type: expectedType,
      name,
      targetFile: decl.getSourceFile().getFilePath(),
    };

    if (entry.type !== expectedType) entry.type = "both";
    metadata.exports.set(name, entry);
  }
}

export function mapGetOrInitialize<M extends Map<any, any>>(
  map: M,
  key: M extends Map<infer K, any> ? K : never,
  makeNew: () => M extends Map<any, infer V> ? V : never,
) {
  if (map.has(key)) {
    return map.get(key)!;
  }

  const created = makeNew();
  map.set(key, created);
  return created;
}
