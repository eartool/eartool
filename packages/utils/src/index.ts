export type { FilePath } from "./FilePath.js";
export type { Flavored } from "./Flavored.js";
export { getPossibleFileLocations } from "./getPossibleFileLocations.js";
export { createConsoleLogger } from "./logging/createConsoleLogger.js";
export { createLogger } from "./logging/createLogger.js";
export { mergePackageJsonDeps } from "./PackageJsonDepsRequired.js";
export type { PackageJsonDepsRequired } from "./PackageJsonDepsRequired.js";
export type { PackageName } from "./PackageName.js";
export { dropDtsFiles } from "./tsmorph/dropDtsFiles.js";
export { findEntireQualifiedNameTree } from "./tsmorph/findEntireQualifiedNameTree.js";
export { findFileLocationForImportExport } from "./tsmorph/findFileLocationForImportExport.js";
export { findNewNameInScope } from "./tsmorph/findNewNameInScope.js";
export type { Export, ExportAlias, Import } from "./tsmorph/getAllImportsAndExports.js";
export { cloneMetadata, getAllImportsAndExports, mapGetOrInitialize } from "./tsmorph/getAllImportsAndExports.js";
export type { Metadata } from "./tsmorph/getAllImportsAndExports.js";
export { getDeclaration } from "./tsmorph/getDeclaration.js";
export { getDefaultIdentifier } from "./tsmorph/getDefaultIdentifier.js";
export { getImportSpecifierOrThrow } from "./tsmorph/getImportSpecifierOrThrow.js";
export { getNamedSpecifiers } from "./tsmorph/getNamedSpecifiers.js";
export { getNamespaceIdentifier } from "./tsmorph/getNamespaceIdentifier.js";
export { getNamespaceIdentifierOrExport } from "./tsmorph/getNamespaceIdentifierOrExport.js";
export { getProperRelativePathAsModuleSpecifierTo } from "./tsmorph/getProperRelativePathAsModuleSpecifierTo.js";
export { getReferenceFindableLocalDeclarationOrThrow } from "./tsmorph/getReferenceFindableLocalDeclarationOrThrow.js";
export { getRootFile } from "./tsmorph/getRootFile.js";
export { getSimplifiedNodeInfo, getSimplifiedNodeInfoAsString } from "./tsmorph/getSimplifiedNodeInfo.js";
export { isInSameNamespace } from "./tsmorph/isInSameNamespace.js";
export { isNamespaceDeclaration } from "./tsmorph/isNamespaceDeclaration.js";
export {
  getNamespaceLike,
  getNamespaceLikeVariable,
  getNamespaceLikeVariableOrThrow,
} from "./tsmorph/isNamespaceLike.js";
export { isRootExport } from "./tsmorph/isRootExport.js";
export { maybeLoadProject } from "./tsmorph/maybeLoadProject.js";
export { organizeImportsOnFiles } from "./tsmorph/organizeImportsOnFiles.js";
export { readPackageJson, writePackageJson } from "./tsmorph/PackageJson.js";
export type { PackageJson } from "./tsmorph/PackageJson.js";
export { weakMemo } from "./weakMemo.js";
export { createWorkspaceFromDisk } from "./workspace/createWorkspaceFromDisk.js";
export type { PackageContext } from "./workspace/PackageContext.js";
export { Workspace } from "./workspace/WorkspaceInfo.js";
export type { DependencyDirection } from "./workspace/WorkspaceInfo.js";
