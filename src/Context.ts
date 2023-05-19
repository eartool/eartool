import { type ModuleDeclaration, Node, type Project, type SourceFile, SyntaxKind } from "ts-morph";
import type { Logger } from "pino";

interface Replacement {
  start: number;
  end: number;
  newValue: string;
  filePath: string;
}

export class ProjectContext {
  #replacements = new Map<string, Replacement[]>();

  constructor(project: Project, public logger: Logger) {
    //
  }

  addReplacement = (replacement: Replacement) => {
    this.#getReplacementsArray(replacement.filePath).push(replacement);
    this.logger.trace("Added replacement %o", replacement);
  };

  addReplacementForNode = (node: Node, newValue: string) => {
    const identifier = Node.isIdentifier(node)
      ? node
      : node.getFirstChildByKindOrThrow(SyntaxKind.Identifier);

    this.logger.warn("%s %d", identifier.getFullText(), identifier.getFullStart());
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

  createNamespaceContext = (namespaceDecl: ModuleDeclaration) => {
    return new NamespaceContext(this, namespaceDecl);
  };

  #getReplacementsArray(filePath: string) {
    const replacements = this.#replacements.get(filePath) ?? [];
    this.#replacements.set(filePath, replacements);
    return replacements;
  }
}

export class NamespaceContext implements Omit<ProjectContext, "createNamespaceContext"> {
  targetSourceFile: SourceFile;
  namespaceDecl: ModuleDeclaration;
  namespaceName: string;
  // namespaceHasConcretePair: boolean;
  typeRenames: Set<string>;
  concreteRenames: Set<string>;
  logger: Logger;
  #projectContext: ProjectContext;

  addReplacement: ProjectContext["addReplacement"];
  addReplacementForNode: ProjectContext["addReplacementForNode"];
  getReplacements: ProjectContext["getReplacements"];

  constructor(projectContext: ProjectContext, decl: ModuleDeclaration) {
    this.#projectContext = projectContext;
    this.targetSourceFile = decl.getSourceFile();
    this.namespaceDecl = decl;
    this.namespaceName = decl.getName();
    this.typeRenames = new Set();
    this.concreteRenames = new Set();
    this.logger = projectContext.logger.child({ namespaceName: this.namespaceName });

    this.addReplacement = this.#projectContext.addReplacement;
    this.addReplacementForNode = this.#projectContext.addReplacementForNode;
    this.getReplacements = this.#projectContext.getReplacements;
  }
}
