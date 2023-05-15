import { SourceFile } from "ts-morph";
import { Node } from "ts-morph";
import * as Assert from "node:assert";
import { getNewName } from "./getNewName.js";

export function renameSymbolsInOriginalFile(
  toRename: Set<string>,
  sf: SourceFile,
  namespaceName: string
) {
  for (const originalName of toRename) {
    const sym = sf.getLocalOrThrow(originalName);

    const decls = sym.getDeclarations();
    Assert.strictEqual(
      decls.length,
      1,
      "invariant failure. how are there multiple"
    );

    const decl = decls[0];

    if (!Node.isVariableDeclaration(decl) && !Node.isNameable(decl)) {
      // console.log(decl.getKindName());
      // console.log(decl.print());
      throw new Error("invariant failure. why is there no name!");
    }

    decl.rename(getNewName(decl, namespaceName));
  }
}
