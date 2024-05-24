import type { Logger } from "pino";
import { SyntaxKind } from "ts-morph";
import type { Node, SourceFile } from "ts-morph";
import type { ProjectContext } from "./Context.js";
import type { Replacement } from "./Replacement.js";
import type { Replacements } from "./Replacements.js";

export abstract class AbstractReplacementsWrapper implements Replacements {
  abstract get logger(): Logger;

  abstract addReplacement(
    filePath: string | Node,
    start: number,
    end: number,
    newValue: string,
  ): void;

  abstract getReplacementsMap(): Map<string, Replacement[]>;

  remove(filePath: string | SourceFile, start: number, end: number): void {
    this.addReplacement(filePath, start, end, "");
  }

  replaceNode(node: Node, newValue: string): void {
    this.logger.trace(
      { primaryNode: node },
      "replaceNode(): originalText: `%s`, newValue: `%s`",
      node.getText(),
      newValue,
    );

    this.addReplacement(node, node.getStart(), node.getEnd(), newValue);
  }

  deleteNode(node: Node, keepTrivia?: boolean): void {
    this.logger.trace({ primaryNode: node }, "Deleting full node: `%s`", node.getFullText());
    this.addReplacement(
      node,
      keepTrivia ? node.getStart() : node.getFullStart(),
      node.getEnd(),
      "",
    );
  }

  insertBefore(node: Node, newValue: string): void {
    const start = node.getStart();

    this.logger.trace(
      { primaryNode: node },
      "insertBefore(): newValue: `%s`, beforeNode: `%s`",
      newValue,
      node.getText(),
    );

    this.addReplacement(node, start, start, newValue);
  }

  insertAfter(node: Node, newValue: string): void {
    this.logger.trace(
      { primaryNode: node },
      "insertAfter(): newValue: %s, afterNode: `%s`",
      newValue,
      node.getText(),
    );

    this.addReplacement(node, node.getEnd(), node.getEnd(), newValue);
  }

  removeNextSiblingIfComma(node: Node) {
    const sib = node.getNextSibling();
    if (sib?.isKind(SyntaxKind.CommaToken)) {
      this.deleteNode(sib);
    }
  }
}

export class ReplacementsWrapperForContext extends AbstractReplacementsWrapper implements Replacements {
  #context: ProjectContext;

  constructor(context: ProjectContext) {
    super();
    this.#context = context;
  }

  get logger() {
    return this.#context.logger;
  }

  addReplacement(filePath: string | Node, start: number, end: number, newValue: string): void {
    this.logger.trace({
      filePath: getFilePath(filePath),
      start,
      end,
      newValue,
    });
    this.#context.addReplacement({
      filePath: getFilePath(filePath),
      start,
      end,
      newValue,
    });
  }

  getReplacementsMap(): Map<string, Replacement[]> {
    return this.#context.getReplacements();
  }
}

export class SimpleReplacements extends AbstractReplacementsWrapper implements Replacements {
  #logger: Logger;
  #replacements: Replacement[] = [];

  constructor(logger: Logger) {
    super();
    this.#logger = logger;
  }

  get logger() {
    return this.#logger;
  }

  addReplacement(filePath: string | Node, start: number, end: number, newValue: string): void {
    this.logger.trace({
      filePath: getFilePath(filePath),
      start,
      end,
      newValue,
    });
    this.#replacements.push({
      filePath: getFilePath(filePath),
      start,
      end,
      newValue,
    });
  }

  getReplacementsMap(): Map<string, Replacement[]> {
    return this.#replacements.reduce((map, a) => {
      const rs = map.get(a.filePath) ?? [];
      if (!map.has(a.filePath)) map.set(a.filePath, rs);
      rs.push(a);

      return map;
    }, new Map<string, Replacement[]>());
  }

  getReplacementsArray() {
    return this.#replacements;
  }
}

export function getFilePath(filePath: string | Node) {
  return typeof filePath == "string" ? filePath : filePath.getSourceFile().getFilePath();
}
