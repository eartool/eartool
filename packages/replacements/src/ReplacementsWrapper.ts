import type { Node } from "ts-morph";
import { SyntaxKind, type SourceFile } from "ts-morph";
import type { ProjectContext } from "./Context.js";
import type { Replacement } from "./Replacement.js";
import type { Replacements } from "./Replacements.js";

export class ReplacementsWrapper implements Replacements {
  #context: ProjectContext;
  constructor(context: ProjectContext) {
    this.#context = context;
  }

  get logger() {
    return this.#context.logger;
  }

  addReplacement(filePath: string | Node, start: number, end: number, newValue: string): void {
    // this.logger.trace({
    //   filePath: getFilePath(filePath),
    //   start,
    //   end,
    //   newValue,
    // });
    this.#context.addReplacement({
      filePath: getFilePath(filePath),
      start,
      end,
      newValue,
    });
  }

  remove(filePath: string | SourceFile, start: number, end: number): void {
    this.addReplacement(filePath, start, end, "");
  }

  replaceNode(node: Node, newValue: string): void {
    this.addReplacement(node, node.getStart(), node.getEnd(), newValue);
  }

  insertBefore(node: Node, newValue: string): void {
    this.addReplacement(node, node.getStart(), node.getStart(), newValue);
  }

  removeNextSiblingIfComma(q: Node) {
    const sib = q.getNextSibling();
    if (sib?.isKind(SyntaxKind.CommaToken)) {
      this.addReplacement(q.getSourceFile(), sib.getStart(), sib.getEnd(), "");
    }
  }

  getReplacementsMap(): Map<string, Replacement[]> {
    return this.#context.getReplacements();
  }
}

export function getFilePath(filePath: string | Node) {
  return typeof filePath == "string" ? filePath : filePath.getSourceFile().getFilePath();
}
