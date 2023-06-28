import { Node, SyntaxKind } from "ts-morph";
import type { ReferenceFindableNode, Symbol, SourceFile } from "ts-morph";
import { getSimplifiedNodeInfoAsString, type FilePath } from "@eartool/utils";

export interface Metadata {
  reexports: Map<string, { exportName: string; isType: boolean }>; // local name to exported name
  reexportsFrom: Map<string, { originFile: FilePath; isType: boolean }>; // name to file its from
  imports: Map<string, { isType: boolean }>;
}

export function getConsumedExports(sf: SourceFile): Map<FilePath, Metadata> {
  const ret = new Map<FilePath, Metadata>();

  // console.log(sf.getFilePath());
  for (const exportedSymbol of sf.getExportSymbols()) {
    // console.log(exportedSymbol.getName());
    for (const decl of exportedSymbol.getDeclarations()) {
      if (decl.isKind(SyntaxKind.ExportSpecifier)) {
        // re-export case!
        handleReferences(decl.getNameNode(), ret, exportedSymbol, true);
      } else if (!Node.isReferenceFindable(decl)) {
        throw new Error("What is this? " + getSimplifiedNodeInfoAsString(decl));
      } else {
        handleReferences(decl, ret, exportedSymbol, false);
      }
    }
  }
  return ret;
}

export const createEmptyMetadata = (): Metadata => ({
  reexports: new Map(),
  imports: new Map(),
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

    // console.log(getSimplifiedNodeInfoAsString(refNode));

    if (refNode.getSourceFile() === decl.getSourceFile()) continue;

    if (parent.isKind(SyntaxKind.ExportSpecifier)) {
      const isType = parent.isTypeOnly() || parent.getParent().getParent().isTypeOnly();
      if (isReexportCase) {
        metadata.reexportsFrom.set(exportedSymbol.getName(), {
          originFile: refNode.getSourceFile().getFilePath(),
          isType,
        });
      } else {
        metadata.reexports.set(exportedSymbol.getName(), {
          exportName: parent.getAliasNode()?.getText() ?? parent.getName(),
          isType,
        });
        // const q = mapGetOrInitialize(metadata.reexports, s.getName(), () => new Set());
        // q.add(refNode.getSourceFile().getFilePath());
      }
    } else if (
      parent.isKind(SyntaxKind.ImportSpecifier) ||
      parent.isKind(SyntaxKind.ImportClause)
    ) {
      const isType = !!(
        parent.isTypeOnly() ||
        parent.getParentIfKind(SyntaxKind.ImportDeclaration)?.isTypeOnly() ||
        parent.getParentIfKind(SyntaxKind.NamedImports)?.getParent().isTypeOnly()
      );
      metadata.imports.set(exportedSymbol.getName(), { isType });
    } else if (parent.isKind(SyntaxKind.VariableDeclaration)) {
      if (parent.isExported()) {
        if (!isReexportCase) {
          // mapGetOrInitialize(metadata.reexports, s.getName(), () => new Set()).add(
          //   refNode.getSourceFile().getFilePath()
          // );
          metadata.reexports.set(exportedSymbol.getName(), {
            exportName: parent.getName(),
            isType: false,
          });
        } else {
          metadata.reexportsFrom.set(exportedSymbol.getName(), {
            originFile: refNode.getSourceFile().getFilePath(),
            isType: false,
          });
        }

        // metadata.reexports.add(s.getName());
        // We may need to do more here...
      }
    } else {
      // console.log(parent.getKindName());
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
