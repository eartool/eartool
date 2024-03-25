import { type ModuleDeclaration, Node, type Project, type SourceFile, SyntaxKind } from "ts-morph";
import type { Logger } from "pino";
import type { PackageContext } from "@eartool/utils";
import type { Replacement } from "./Replacement.js";
import type { PackageExportRename } from "./PackageExportRename.js";

export class ProjectContext implements PackageContext {
  #replacements = new Map<string, Replacement[]>();
  #recordedRenames: PackageExportRename[] = [];

  constructor(
    public project: Project,
    public logger: Logger,
    public packagePath: string,
    public packageName: string,
    public packageJson: any,
  ) {}

  addReplacement = (replacement: Replacement) => {
    this.#getReplacementsArray(replacement.filePath).push(replacement);
    this.logger.trace(
      "Added Replacement %s:%d:%d with '%s'",
      replacement.filePath,
      replacement.start,
      replacement.end,
      replacement.newValue,
    );
  };

  addReplacementForNode = (node: Node, newValue: string) => {
    const identifier = Node.isIdentifier(node)
      ? node
      : node.getFirstChildByKindOrThrow(SyntaxKind.Identifier);

    this.logger.trace("%s %d", identifier.getFullText(), identifier.getFullStart());
    const filePath = node.getSourceFile().getFilePath();

    const replacement: Replacement = {
      start: identifier.getStart(),
      end: identifier.getEnd(),
      newValue,
      filePath,
    };
    this.addReplacement(replacement);
  };

  getReplacements = () => {
    return this.#replacements;
  };

  getRecordedRenames = () => {
    return this.#recordedRenames;
  };

  createNamespaceContext = (namespaceDecl: ModuleDeclaration) => {
    return new NamespaceContext(this, namespaceDecl);
  };

  recordRename = (from: string[], to: string[]) => {
    this.#recordedRenames.push({ from, to });
  };

  #getReplacementsArray(filePath: string) {
    const replacements = this.#replacements.get(filePath) ?? [];
    this.#replacements.set(filePath, replacements);
    return replacements;
  }
}

// THIS BELONGS SOMEWHERE ELSE
export class NamespaceContext implements Omit<ProjectContext, "createNamespaceContext"> {
  targetSourceFile: SourceFile;
  namespaceDecl: ModuleDeclaration;
  namespaceName: string;
  logger: Logger;
  #projectContext: ProjectContext;
  renames = new Map<string, { type?: { exported: boolean }; concrete?: { exported: boolean } }>();

  addReplacement: ProjectContext["addReplacement"];
  addReplacementForNode: ProjectContext["addReplacementForNode"];
  getReplacements: ProjectContext["getReplacements"];
  recordRename: ProjectContext["recordRename"];
  getRecordedRenames: ProjectContext["getRecordedRenames"];
  packageJson: ProjectContext["packageJson"];
  packageName: string;
  packagePath: string;
  project: Project;

  constructor(projectContext: ProjectContext, decl: ModuleDeclaration) {
    this.#projectContext = projectContext;
    this.targetSourceFile = decl.getSourceFile();
    this.namespaceDecl = decl;
    this.namespaceName = decl.getName();
    this.logger = projectContext.logger.child({ namespaceName: this.namespaceName });

    this.addReplacement = this.#projectContext.addReplacement;
    this.addReplacementForNode = this.#projectContext.addReplacementForNode;
    this.getReplacements = this.#projectContext.getReplacements;
    this.recordRename = this.#projectContext.recordRename;
    this.getRecordedRenames = this.#projectContext.getRecordedRenames;

    this.packageName = this.#projectContext.packageName;
    this.packagePath = this.#projectContext.packagePath;
    this.project = this.#projectContext.project;
    this.packageJson = this.#projectContext.packageJson;
  }

  addConcreteRename = (name: string, exported: boolean) => {
    const r = this.renames.get(name) ?? {};
    this.renames.set(name, r);
    r.concrete = { exported };
  };

  addTypeRename = (name: string, exported: boolean) => {
    const r = this.renames.get(name) ?? {};
    this.renames.set(name, r);
    r.type = { exported };
  };

  get projectContext() {
    return this.#projectContext;
  }
}
