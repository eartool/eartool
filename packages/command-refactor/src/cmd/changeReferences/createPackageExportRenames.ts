import { type PackageExportRename, type PackageExportRenames } from "@eartool/replacements";

export function createPackageExportRenames(rename: string): PackageExportRenames {
  const parts = rename.split(":");
  if (parts.length != 4) throw new Error("Invalid argument");
  const [fromModule, fromPart, toModulePart, toPart] = parts;

  if (fromModule.length === 0) {
    throw new Error("the from module must be specified");
  }
  if (fromPart.length === 0) {
    throw new Error("the from must be specified");
  }

  const from = fromPart.split(".");
  const toFileOrModule = toModulePart.length > 0 ? toModulePart : undefined;
  const to = toPart.length > 0 ? toPart.split(".") : undefined;

  if (to === undefined && toFileOrModule === undefined)
    throw new Error("You must at least speciy a new name or a new module (or both)");

  const p = { from, toFileOrModule, to } as PackageExportRename;

  return new Map([[fromModule, [p]]]);
}
