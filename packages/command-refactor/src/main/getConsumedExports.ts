import { Node, SyntaxKind } from "ts-morph";
import type { ReferenceFindableNode, Symbol, SourceFile } from "ts-morph";
import { getSimplifiedNodeInfoAsString, type FilePath } from "@eartool/utils";

export interface Metadata {
  reexports: Map<string, string>; // local name to exported name
  reexportsFrom: Map<string, string>; // name to file its from
  imports: Set<string>;
}

export function getConsumedExports(sf: SourceFile): Map<FilePath, Metadata> {
  const ret = new Map<FilePath, Metadata>();

  for (const exportedSymbols of sf.getExportSymbols()) {
    // console.log(getSimplifiedNodeInfoAsString(s));

    for (const decl of exportedSymbols.getDeclarations()) {
      if (decl.isKind(SyntaxKind.ExportSpecifier)) {
        // re-export case!
        handleReferences(decl.getNameNode(), ret, exportedSymbols, true);
      } else if (!Node.isReferenceFindable(decl)) {
        throw new Error("What is this? " + getSimplifiedNodeInfoAsString(decl));
      } else {
        handleReferences(decl, ret, exportedSymbols, false);
      }
    }
  }
  return ret;
}

export const createEmptyMetadata = (): Metadata => ({
  reexports: new Map(),
  imports: new Set(),
  reexportsFrom: new Map(),
});
function handleReferences(
  decl: ReferenceFindableNode & Node,
  filePathToMetaData: Map<FilePath, Metadata>,
  exportedSymbol: Symbol,
  isReexportCase: boolean
) {
  for (const refNode of decl.findReferencesAsNodes()) {
    const metadata = mapGetOrInitialize(
      filePathToMetaData,
      (isReexportCase ? decl : refNode).getSourceFile().getFilePath(),
      createEmptyMetadata
    );

    const parent = refNode.getParentOrThrow();

    if (refNode.getSourceFile() === decl.getSourceFile()) continue;

    if (parent.isKind(SyntaxKind.ExportSpecifier)) {
      if (isReexportCase) {
        metadata.reexportsFrom.set(exportedSymbol.getName(), refNode.getSourceFile().getFilePath());
      } else {
        metadata.reexports.set(
          exportedSymbol.getName(),
          parent.getAliasNode()?.getText() ?? parent.getName()
        );
        // const q = mapGetOrInitialize(metadata.reexports, s.getName(), () => new Set());
        // q.add(refNode.getSourceFile().getFilePath());
      }
    } else if (
      parent.isKind(SyntaxKind.ImportSpecifier) ||
      parent.isKind(SyntaxKind.ImportClause)
    ) {
      metadata.imports.add(exportedSymbol.getName());
    } else if (parent.isKind(SyntaxKind.VariableDeclaration)) {
      if (parent.isExported()) {
        if (!isReexportCase) {
          // mapGetOrInitialize(metadata.reexports, s.getName(), () => new Set()).add(
          //   refNode.getSourceFile().getFilePath()
          // );
          metadata.reexports.set(exportedSymbol.getName(), parent.getName());
        } else {
          metadata.reexportsFrom.set(
            exportedSymbol.getName(),
            refNode.getSourceFile().getFilePath()
          );
        }

        // metadata.reexports.add(s.getName());
        // We may need to do more here...
      }
    }

    // console.log(getSimplifiedNodeInfoAsString(refNode));
  }
}

function mapGetOrInitialize<K, V>(map: Map<K, V>, key: K, makeNew: () => V) {
  if (map.has(key)) {
    return map.get(key)!;
  }

  const q = makeNew();
  map.set(key, q);
  return q;
}
