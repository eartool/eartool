import { ModuleDeclaration, SourceFile } from "ts-morph";
import { type Logger } from "pino";

export interface Context {
  targetSourceFile: SourceFile;
  namespaceDecl: ModuleDeclaration;
  namespaceName: string;
  // namespaceHasConcretePair: boolean;
  typeRenames: Set<string>;
  concreteRenames: Set<string>;
  logger: Logger;
}
