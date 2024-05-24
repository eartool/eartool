import type { FilePath, PackageName } from "@eartool/utils";
import * as path from "node:path";
import { Project } from "ts-morph";
import type { WorkspaceBuilder } from "./WorkspaceBuilder.js";

export class ProjectBuilder {
  #project: Project;
  #packagePath: FilePath;
  #packageName: PackageName;
  #workspace: WorkspaceBuilder<any>;

  constructor(packageName: PackageName, packagePath: FilePath, workspace: WorkspaceBuilder<any>) {
    this.#project = new Project({
      // skipAddingFilesFromTsConfig: true,
      tsConfigFilePath: path.join(packagePath, "tsconfig.json"),
      fileSystem: workspace.fileSystem,
    });
    this.#packageName = packageName;
    this.#packagePath = packagePath;
    this.#workspace = workspace;
  }

  /**
   * @param filePath relative to the projectPath
   * @param contents
   * @returns
   */
  addFile(relativeFilePath: string, contents: string) {
    if (relativeFilePath.startsWith("/")) {
      throw new Error(`File path must be relative: ${relativeFilePath}`);
    }
    const filePath = path.resolve(this.#packagePath, relativeFilePath);
    const sf = this.#project.createSourceFile(filePath, contents);
    sf.saveSync();

    return this;
  }

  addDependency(packageName: string) {
    this.#workspace.addDependency(this.#packageName, packageName);
    return this;
  }

  get project() {
    return this.#project;
  }
}
