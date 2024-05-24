import type { Logger } from "pino";
import type { Node, SourceFile } from "ts-morph";
import type { Replacement } from "./Replacement.js";

export interface Replacements {
  addReplacement(file: SourceFile | string, start: number, end: number, newValue: string): void;
  remove(file: SourceFile | string, start: number, end: number): void;
  replaceNode(node: Node, newValue: string): void;
  deleteNode(node: Node, keepTrivia?: boolean): void;
  insertBefore(node: Node, newValue: string): void;
  insertAfter(node: Node, newValue: string): void;
  removeNextSiblingIfComma(node: Node): void;

  getReplacementsMap(): Map<string, Replacement[]>;

  logger: Logger;
}
