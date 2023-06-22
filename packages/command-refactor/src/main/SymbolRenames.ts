import type { PackageExportRename } from "@eartool/replacements";
import type { FilePath, PackageName } from "@eartool/utils";
import { ArrayMultimap } from "@teppeis/multimaps";
import deepEqual from "deep-equal";

export class SymbolRenames {
  raw: ArrayMultimap<PackageName | FilePath, PackageExportRename>;

  constructor(
    raw?:
      | ArrayMultimap<PackageName | FilePath, PackageExportRename>
      | Map<PackageName | FilePath, PackageExportRename[]>
  ) {
    if (!raw) {
      this.raw = new ArrayMultimap();
    } else if (raw instanceof ArrayMultimap) {
      this.raw = raw;
    } else {
      this.raw = new ArrayMultimap();
      for (const [key, values] of raw) {
        this.raw.putAll(key, values);
      }
    }
  }

  addRename(packageName: PackageName | FilePath, arg1: PackageExportRename) {
    const existing =
      this.raw.has(packageName) && this.raw.get(packageName).find((a) => deepEqual(a, arg1));
    if (!existing) {
      this.raw.put(packageName, arg1);
    }
  }

  asRaw() {
    return this.raw.asMap();
  }
}
