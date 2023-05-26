import type { SourceFile } from "ts-morph";
import { Project } from "ts-morph";
import { createTestLogger } from "../createTestLogger.js";
import { ReplacementsWrapper } from "../ReplacementsWrapper.js";
import { ProjectContext } from "../Context.js";
import { processReplacements } from "./processReplacements.js";
import type { Replacements } from "./Replacements.js";
import { format } from "prettier";

export class TestBuilder {
  #project: Project;
  #files = new Map<string, SourceFile>();
  #replacements: Replacements;

  constructor() {
    this.#project = new Project({
      useInMemoryFileSystem: true,
      skipAddingFilesFromTsConfig: true,
    });

    const logger = createTestLogger();
    const projectContext = new ProjectContext(this.#project, logger);
    this.#replacements = new ReplacementsWrapper(projectContext);
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

  addFile(filePath: string, contents: string) {
    const sf = this.#project.createSourceFile(filePath, contents);
    sf.saveSync();
    this.#files.set(filePath, sf);

    return this;
  }

  performWork(
    f: (args: {
      project: Project;
      replacements: Replacements;
      files: Map<string, SourceFile>;
    }) => void
  ) {
    f(this);
    return this;
  }

  build() {
    const changedFiles = [
      ...processReplacements(this.project, this.replacements.getReplacementsMap()),
    ];

    return {
      changedFiles,
      output: changedFiles
        .map(
          (filePath) =>
            `\n//\n// <${filePath}>\n//\n\n` +
            format(this.project.getSourceFile(filePath)!.getFullText(), {
              parser: "typescript",
              tabWidth: 2,
              useTabs: false,
            }) +
            `\n\n//\n// </${filePath}>\n//\n\n`
        )
        .join("\n\n"),
    };
  }
}
