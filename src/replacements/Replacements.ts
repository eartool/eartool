import type { Node } from "ts-morph";
import type { SourceFile } from "ts-morph";

export interface Replacements {
  addReplacement(file: SourceFile | string, start: number, end: number, newValue: string): void;
  remove(file: SourceFile | string, start: number, end: number): void;
  replaceNode(node: Node, newValue: string): void;
  insertBefore(node: Node, newValue: string): void;
  removeNextSiblingIfComma(q: Node): void;
}
