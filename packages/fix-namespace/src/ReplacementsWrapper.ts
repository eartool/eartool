import type { Node } from "ts-morph";
import { SyntaxKind, type SourceFile } from "ts-morph";
import type { ProjectContext } from "./Context.js";
import type { Replacements } from "./replacements/Replacements.js";
import { getFilePath } from "./processProject.js";

export class ReplacementsWrapper implements Replacements {
  #context: ProjectContext;
  constructor(context: ProjectContext) {
    this.#context = context;
  }

  addReplacement(filePath: string | Node, start: number, end: number, newValue: string): void {
    console.log({
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
}
