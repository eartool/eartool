import * as path from "node:path";
import { Workspace } from "@eartool/batch";
import { createTestLogger } from "@eartool/test-utils";
import { writePackageJson, type FilePath, type PackageName, readPackageJson } from "@eartool/utils";
import type { Logger } from "pino";
import type { Project } from "ts-morph";
import { InMemoryFileSystemHost } from "ts-morph";
import { SimpleReplacements } from "@eartool/replacements";
import type { WorkerPackageContext } from "../worker/WorkerPackageContext.js";
import { ProjectBuilder } from "./ProjectBuilder.js";

type CreateProjectOpts = {
  esm?: boolean;
};

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

  createProject(
    packageName: PackageName,
    opts: CreateProjectOpts,
    callback: (projectBuilder: ProjectBuilder) => void
  ): this;
  createProject(packageName: PackageName, callback: (projectBuilder: ProjectBuilder) => void): this;
  createProject(
    packageName: PackageName,
    opts: CreateProjectOpts | ((projectBuilder: ProjectBuilder) => void),
    callback?: (projectBuilder: ProjectBuilder) => void
  ) {
    const realCallback = callback ?? (opts as (projectBuilder: ProjectBuilder) => void);
    const esm = callback ? (opts as CreateProjectOpts).esm : false;

    const packagePath = path.resolve(this.#workspacePath, packageName);
    this.#fs.mkdirSync(packagePath);
    this.#fs.mkdirSync(path.join(packagePath, "src"));

    this.#fs.writeFileSync(
      path.join(packagePath, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          outDir: "lib",
          rootDir: "src",
          moduleResolution: esm ? "Node16" : "Node10",
        },
      })
    );

    writePackageJson(this.#fs, packagePath, {
      name: packageName,
      dependencies: {},
      ...(esm ? { type: "module" } : {}),
    });

    const builder = new ProjectBuilder(packageName, packagePath, this);
    realCallback(builder);
    builder.project.saveSync();
    this.#packageNameToProject.set(packageName, builder.project);
    this.#packagePathToProject.set(packagePath, builder.project);
    this.#workspace.addPackage(packageName, packagePath);
    return this;
  }

  addDependency(from: PackageName, to: PackageName) {
    const fromPackage = this.#workspace.getPackageBy({ name: from });
    const toPackage = this.#workspace.getPackageBy({ name: to });

    if (fromPackage && toPackage) {
      this.#actuallyAddDependency(from, to);
    } else {
      this.#deferredDependency.push([from, to]);
    }
  }

  #actuallyAddDependency(from: PackageName, to: PackageName) {
    const fromPackage = this.#workspace.getPackageByNameOrThrow(from);
    const toPackage = this.#workspace.getPackageByNameOrThrow(to);

    fromPackage.addDependency(toPackage);
    const packageJson = readPackageJson(this.#fs, fromPackage.packagePath);
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    packageJson.dependencies[to] = "workspace:*";
    writePackageJson(this.#fs, fromPackage.packagePath, packageJson);
  }

  build() {
    for (const [from, to] of this.#deferredDependency) {
      this.#actuallyAddDependency(from, to);
    }
    const workspace = this.#workspace;
    const projectLoader = (packagePath: FilePath) => {
      return this.#packagePathToProject.get(packagePath);
    };
    return {
      workspace,
      workspacePath: this.#workspacePath,
      projectLoader,
      getWorkerPackageContext: function getWorkerPackageContext(name: string) {
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
      },
    };
  }

  get fileSystem() {
    return this.#fs;
  }
}
