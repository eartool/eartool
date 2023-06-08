import { Workspace } from "@eartool/batch";
import { createTestLogger } from "@eartool/test-utils";
import type { FilePath, PackageName } from "@eartool/utils";
import * as path from "node:path";
import type { Logger } from "pino";
import type { Project } from "ts-morph";
import { InMemoryFileSystemHost } from "ts-morph";
import { ProjectBuilder } from "./ProjectBuilder.js";

export class WorkspaceBuilder {
  #fs: InMemoryFileSystemHost;
  #logger: Logger;
  #packageNameToProject = new Map<PackageName, Project>();
  #packagePathToProject = new Map<FilePath, Project>();
  #workspace: Workspace;
  #deferredDependency: Array<[PackageName, PackageName]> = [];
  #workspacePath: FilePath;

  constructor(workspacePath: FilePath) {
    this.#logger = createTestLogger();
    this.#fs = new InMemoryFileSystemHost();
    this.#workspace = new Workspace();
    this.#workspacePath = workspacePath;
  }

  /**
   *
   * @param packageName
   * @param packagePath Relative to workspacePath
   * @param callback
   */
  createProject = (
    packageName: PackageName,
    callback: (projectBuilder: ProjectBuilder) => void
  ) => {
    const packagePath = path.resolve(this.#workspacePath, packageName);

    const builder = new ProjectBuilder(packageName, packagePath, this);
    callback(builder);
    builder.project.saveSync();
    this.#packageNameToProject.set(packageName, builder.project);
    this.#packagePathToProject.set(packagePath, builder.project);
    this.#workspace.addPackage(packageName, packagePath);
    return this;
  };

  addDependency(from: PackageName, to: PackageName) {
    const fromPackage = this.#workspace.getPackageBy({ name: from });
    const toPackage = this.#workspace.getPackageBy({ name: to });

    if (fromPackage && toPackage) {
      fromPackage.addDependency(toPackage);
    } else {
      this.#deferredDependency.push([from, to]);
    }
  }

  build() {
    return {
      workspace: this.#workspace,
      projectLoader: (packagePath: FilePath) => {
        return this.#packagePathToProject.get(packagePath);
      },
    };
  }

  get fileSystem() {
    return this.#fs;
  }
}
