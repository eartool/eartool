import type { SourceFile } from "ts-morph";
import { type PackageContext, getAllImportsAndExports } from "@eartool/utils";

export function getConsumedExports(ctx: PackageContext, sf: SourceFile) {
  const q = getAllImportsAndExports(ctx);

  for (const [filePath, metadata] of q) {
    if (filePath === sf.getFilePath()) continue;

    for (const [name, { originFile }] of metadata.reexports) {
      if (originFile !== sf.getFilePath()) {
        metadata.reexports.delete(name);
      }
    }

    for (const [name, { originFile }] of metadata.imports) {
      if (originFile !== sf.getFilePath()) {
        metadata.imports.delete(name);
      }
    }

    if (metadata.reexports.size == 0 && metadata.imports.size == 0) {
      q.delete(filePath);
    }
  }
  return q;
}
