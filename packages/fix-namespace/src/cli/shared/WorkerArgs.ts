import type { PackageExportRename } from "@eartool/replacements";

export interface WorkerArgs {
  removeNamespaces: boolean;
  removeFauxNamespaces: boolean;
  organizeImports: boolean;
  fixDownstream: boolean;
  additionalRenames: Map<string, PackageExportRename[]>;
}
