import { SimpleReplacements } from "@eartool/replacements";
import { type PackageContext } from "@eartool/utils";
import { createTestLogger } from "@eartool/test-utils";
import type { WorkerPackageContext } from "../worker/WorkerPackageContext.js";
import { WorkspaceBuilder } from "./WorkspaceBuilder.js";
import { type PackageContextFactory } from "./WorkspaceBuilder.js";

export class RefactorWorkspaceBuilder extends WorkspaceBuilder<WorkerPackageContext> {
  constructor(workspacePath: string) {
    super(workspacePath, getWorkerPackageContext);
  }
}

export function getWorkerPackageContext({
  projectLoader,
  name,
  workspace,
}: Parameters<PackageContextFactory<PackageContext>>[0]) {
  const packageInfo = workspace.getPackageByNameOrThrow(name);
  const project = projectLoader(packageInfo.packagePath)!;
  const logger = createTestLogger();

  const packageContext: WorkerPackageContext = {
    logger: createTestLogger(),
    packageName: packageInfo.name,
    packagePath: packageInfo.packagePath,
    project,
    replacements: new SimpleReplacements(logger),
  };
  return packageContext;
}