import type { Workspace } from "@eartool/batch";
import type { FilePath } from "@eartool/utils";
import { SetMultimap } from "@teppeis/multimaps";
import type { PackageName } from "../shared/PackageName.js";

export function mapFilesByPackageName(workspace: Workspace, files: Iterable<FilePath>) {
  const packagePathToName = workspace.getPackageDirToNameMap();

  const ret = new SetMultimap<PackageName, FilePath>();

  // I hate how bleh this method is
  for (const f of files) {
    const candidates: FilePath[] = [];
    for (const [packagePath] of packagePathToName) {
      if (f.startsWith(packagePath)) {
        candidates.push(packagePath);
        continue;
      }
    }

    if (candidates.length == 0) {
      throw new Error(`Couldn't figure out which package "${f}" is in!`);
    }

    const best = candidates.sort((a, b) => b.length - a.length)[0];

    ret.put(packagePathToName.get(best)!, f);
  }
  return ret;
}
