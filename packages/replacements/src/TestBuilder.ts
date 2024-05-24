import { createTestLogger, formatTestTypescript } from "@eartool/test-utils";
import type { PackageContext } from "@eartool/utils";
import pMap from "p-map";
import { format } from "prettier";
import type { SourceFile } from "ts-morph";
import { Project } from "ts-morph";
import { processReplacements } from "./processReplacements.js";
import type { Replacements } from "./Replacements.js";
import { SimpleReplacements } from "./ReplacementsWrapper.js";

export class TestBuilder {
  #project: Project;
  #files = new Map<string, SourceFile>();
  #replacements: Replacements;
  #asyncTask?: Promise<unknown>;

  constructor() {
    this.#project = new Project({
      useInMemoryFileSystem: true,
      skipAddingFilesFromTsConfig: true,
    });

    const logger = createTestLogger();

    this.#replacements = new SimpleReplacements(logger);
  }

  get project() {
    return this.#project;
  }
  get files() {
    return this.#files;
  }
  get replacements() {
    return this.#replacements;
  }

  get ctx(): PackageContext {
    return {
      logger: this.replacements.logger,
      packageName: "foo",
      packagePath: "foo",
      project: this.project,
      packageJson: {},
    };
  }

  addFile(filePath: string, contents: string) {
    this.#asyncTask = Promise.resolve(this.#asyncTask).then(async () => {
      const sf = this.#project.createSourceFile(filePath, await formatTestTypescript(contents));
      await sf.save();
      this.#files.set(filePath, sf);
    });

    return this;
  }

  performWork(
    f: (args: {
      ctx: PackageContext;
      project: Project;
      replacements: Replacements;
      files: Map<string, SourceFile>;
    }) => void | Promise<void>,
  ) {
    const self = this;
    this.#asyncTask = Promise.resolve(this.#asyncTask).then(async () => {
      await f(self);
    });

    return this;
  }

  async build() {
    await this.#asyncTask;

    const changedFiles = [
      ...processReplacements(this.project, this.replacements.getReplacementsMap()),
    ];

    return {
      project: this.project,
      changedFiles,
      output: (
        await pMap(
          changedFiles,
          async (filePath) =>
            `\n//\n// <${filePath}>\n//\n\n` +
            (await format(this.project.getSourceFile(filePath)!.getFullText(), {
              parser: "typescript",
              tabWidth: 2,
              useTabs: false,
            })) +
            `\n\n//\n// </${filePath}>\n//\n\n`,
        )
      ).join("\n\n"),
    };
  }
}
