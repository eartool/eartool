export type { FilePath } from "./FilePath.js";
export type { Flavored } from "./Flavored.js";
export type { PackageContext } from "./PackageContext.js";
export { readPackageJson, writePackageJson } from "./PackageJson.js";
export type { PackageJson } from "./PackageJson.js";
export type { PackageName } from "./PackageName.js";
export { createConsoleLogger } from "./createConsoleLogger.js";
export { findNewNameInScope } from "./findNewNameInScope.js";
export { getProperRelativePathAsModuleSpecifierTo } from "./getProperRelativePathAsModuleSpecifierTo.js";
export { getSimplifiedNodeInfo, getSimplifiedNodeInfoAsString } from "./getSimplifiedNodeInfo.js";
export { maybeLoadProject } from "./maybeLoadProject.js";
export { dropDtsFiles } from "./tsmorph/dropDtsFiles.js";
export { findEntireQualifiedNameTree } from "./tsmorph/findEntireQualifiedNameTree.js";
export { getImportSpecifierOrThrow } from "./tsmorph/getImportSpecifierOrThrow.js";
export { getReferenceFindableLocalDeclarationOrThrow } from "./tsmorph/getReferenceFindableLocalDeclarationOrThrow.js";
export { isInSameNamespace } from "./tsmorph/isInSameNamespace.js";
export { isNamespaceDeclaration } from "./tsmorph/isNamespaceDeclaration.js";
export { isNamespaceLike } from "./tsmorph/isNamespaceLike.js";
export type { NamespaceLike, NamespaceLikeVariableDeclaration } from "./tsmorph/isNamespaceLike.js";
export { isRootExport } from "./tsmorph/isRootExport.js";
export { organizeImportsOnFiles } from "./tsmorph/organizeImportsOnFiles.js";
export { createLogger } from "./shared/createLogger.js";
export type { DependencyDirection } from "./main/WorkspaceInfo.js";
export { Workspace } from "./main/WorkspaceInfo.js";
export { createWorkspaceFromDisk } from "./main/createWorkspaceFromDisk.js";
