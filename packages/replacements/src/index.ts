export { NamespaceContext, ProjectContext } from "./Context.js";
export type { PackageExportRename, PackageExportRenames } from "./PackageExportRename.js";
export type { Replacement } from "./Replacement.js";
export type { Replacements } from "./Replacements.js";
export { ReplacementsWrapperForContext, SimpleReplacements } from "./ReplacementsWrapper.js";
export { addImportOrExport } from "./accumulateRenamesForImportedIdentifier.js";
export { addSingleFileReplacementsForRenames } from "./addSingleFileReplacementsForRenames.js";
export { autorenameIdentifierAndReferences } from "./autorenameIdentifierAndReferences.js";
export { getReplacementsForRenames } from "./getReplacementsForRenames.js";
export { processReplacements } from "./processReplacements.js";
export { replaceAllNamesInScope } from "./replaceAllNamesInScope.js";
