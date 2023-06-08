export type { PackageExportRename } from "./PackageExportRename.js";
export type { Replacement } from "./Replacement.js";
export type { Replacements } from "./Replacements.js";
export { ReplacementsWrapperForContext, SimpleReplacements } from "./ReplacementsWrapper.js";
export { getReplacementsForRenames } from "./getReplacementsForRenames.js";
export { replaceAllNamesInScope } from "./replaceAllNamesInScope.js";
export { autorenameIdentifierAndReferences } from "./autorenameIdentifierAndReferences.js";
export { ProjectContext, NamespaceContext } from "./Context.js";
export { processReplacements } from "./processReplacements.js";
export { addSingleFileReplacementsForRenames } from "./addSingleFileReplacementsForRenames.js";

// TODO Move this to its own file
// export { TestBuilder } from "./TestBuilder.js";
