import { type ExportSpecifierStructure, type OptionalKind } from "ts-morph";

export function makeExportSpecifiers(names: Set<string>, isTypeOnly: boolean) {
  return Array.from(names).map<OptionalKind<ExportSpecifierStructure>>((name) => {
    return {
      name,
      isTypeOnly,
    };
  });
}
