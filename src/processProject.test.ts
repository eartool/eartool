import { describe, expect, it } from "@jest/globals";
import { format } from "prettier";
import { Node, Project, SourceFile } from "ts-morph";
import { processProject } from "./processProject.js";
import { pino } from "pino";
import pinoPretty from "pino-pretty";

function formatTestTypescript(src: string) {
  return format(src, { parser: "typescript", tabWidth: 2, useTabs: false });
}

const cases = [
  {
    name: "redeclare export",
    inputs: new Map([
      [
        "foo.tsx",
        `
        export namespace Foo {
          export function bar() {
            return 5;
          }

          export function baz() {
            return 5;
          }
        }
        `,
      ],
      [
        "index.ts",
        `
      export {Foo} from "./foo";
      `,
      ],
    ]),
    outputs: new Map([
      [
        "foo.tsx",
        `
          export function barOfFoo() {
           return 5;
          }

          export function bazOfFoo() {
            return 5;
           }
      `,
      ],
      [
        "index.ts",
        `
    export {barOfFoo, bazOfFoo} from "./foo";
    `,
      ],
    ]),
  },
  {
    name: "function invoke within namespace",
    inputs: new Map([
      [
        "foo.tsx",
        `
        export namespace Foo {
          export function bar() {
            baz();
          }

          export function baz() {
            return 5;
          }
        }
        `,
      ],
    ]),
    outputs: new Map([
      [
        "foo.tsx",
        `
        
          export function barOfFoo() {
            bazOfFoo();
          }

          export function bazOfFoo() {
            return 5;
          }
        
      `,
      ],
    ]),
  },
  {
    name: "combined types",
    inputs: new Map([
      [
        "foo.tsx",
        `export namespace AssociatedMapSection {
        export interface OgreProps {
          properties: Property<any>[];
        }
      
        export interface ReduxProps {
          appRealmId: RealmId;
          mapConfig: GaiaMapConfig;
        }
      
        export interface State {
          map?: MapSearchResult;
          user?: IAcmeUser;
          isLoading: boolean;
        }
      
        export type Props = OverviewObjectMinProps & OgreProps & ReduxProps;
      }`,
      ],
    ]),
    outputs: new Map([
      [
        "foo.tsx",
        `
      
        export interface AssociatedMapSectionOgreProps {
          properties: Property<any>[];
        }
      
        export interface AssociatedMapSectionReduxProps {
          appRealmId: RealmId;
          mapConfig: GaiaMapConfig;
        }
      
        export interface AssociatedMapSectionState {
          map?: MapSearchResult;
          user?: IAcmeUser;
          isLoading: boolean;
        }
      
        export type AssociatedMapSectionProps = OverviewObjectMinProps & AssociatedMapSectionOgreProps & AssociatedMapSectionReduxProps;
      `,
      ],
    ]),
  },
  {
    name: "works nicely with interfaces",
    // We cant break foo out in this case cause im too lazy to implement this another way.
    inputs: new Map([
      [
        "foo.tsx",
        `
            export namespace Foo {
                export interface Props { what: number }
            }

            class Foo extends React.Component<Foo.Props> {

            }
            `,
      ],
    ]),
    outputs: new Map([
      [
        "foo.tsx",
        `   
            export interface FooProps { what: number }


            class Foo extends React.Component<FooProps> {

            }
            `,
      ],
    ]),
  },
  {
    name: "dont explode if error",
    // We cant break foo out in this case cause im too lazy to implement this another way.
    inputs: new Map([
      [
        "foo.ts",
        `
            const foo = 5;
            
            export namespace Wat {
                export const foo = 6;
            }
            `,
      ],
    ]),
    outputs: new Map([
      [
        "foo.ts",
        `
            const foo = 5;
            
            export namespace Wat {
                export const foo = 6;
            }
            `,
      ],
    ]),
  },
  {
    name: "simple",
    inputs: new Map([
      [
        "foo.ts",
        `
        const foo = 5;
        
        export namespace Wat {
            export const aasdf = 3;
            export const second = 5;

            export const thirdSpaced = 56;

            // Foo
            export const fourthWithComment = 555;
        }
        `,
      ],
    ]),
    outputs: new Map([
      [
        "foo.ts",
        `
        const foo = 5;
    
        export const aasdfOfWat = 3;
        export const secondOfWat = 5;

        export const thirdSpacedOfWat = 56;

        // Foo
        export const fourthWithCommentOfWat = 555;
        `,
      ],
    ]),
  },
  {
    name: "rename in other file",
    inputs: new Map([
      [
        "wat.ts",
        `
        
        export namespace Wat {
            export const key = 3;
            export function f() { return 5; }

            export class Foo {}
        }
        `,
      ],
      [
        "refWat.ts",
        `import {Wat} from "./wat";
        console.log(Wat.key);
        console.log(Wat.f());
        console.log(new Wat.Foo());
        `,
      ],
    ]),
    outputs: new Map([
      [
        "wat.ts",
        `
        export const keyOfWat = 3;
        export function fOfWat() { return 5; }

        export class FooOfWat {}
        `,
      ],
      [
        "refWat.ts",
        `import {FooOfWat, fOfWat, keyOfWat} from "./wat";
        
        console.log(keyOfWat);
        console.log(fOfWat());
        console.log(new FooOfWat());
        `,
      ],
    ]),
  },
];

describe("processProject", () => {
  it.each(cases)("$name", async ({ inputs, outputs }) => {
    const project = new Project({
      useInMemoryFileSystem: true,
      skipAddingFilesFromTsConfig: true,
    });
    for (const [name, contents] of inputs) {
      project.createSourceFile(name, contents);
    }

    const logger = pino(
      {
        level: "trace",
        serializers: {
          ...pino.stdSerializers,
          foo: (n: Node) =>
            `${n.getSourceFile().getFilePath()}:${n.getStartLineNumber()}`,
        },
        hooks: {
          logMethod: function logMethod([msg, ...args], method, foo) {
            args = args.map((a: any) => maybeConvertNodeToFileAndLineNum(a));
            // console.log([msg, ...args]);
            method.apply(this, [msg, ...args]);
          },
        },
      },
      pinoPretty.default({
        colorize: true,
        sync: true,
      })
    );

    await processProject(project, {
      logger,
    });

    const fs = project.getFileSystem();

    for (const [name, expectedContents] of outputs) {
      // TODO: Can we get this thing to just prettier
      const writtenContents = formatTestTypescript(fs.readFileSync(name));
      expect(writtenContents).toBe(formatTestTypescript(expectedContents));
    }
  });
});
function maybeConvertNodeToFileAndLineNum(a: any): any {
  if (a instanceof Node) {
    return `${a.getSourceFile().getFilePath()}:${a.getStartLineNumber()}`;
  }

  return a;
}
