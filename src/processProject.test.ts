import { beforeEach, describe, expect, it } from "@jest/globals";
import { format } from "prettier";
import { Node, Project, SourceFile } from "ts-morph";
import { processProject } from "./processProject.js";
import { pino } from "pino";
import pinoPretty from "pino-pretty";
import { Writable } from "stream";

function formatTestTypescript(src: string) {
  return format(src, { parser: "typescript", tabWidth: 2, useTabs: false });
}

const cases = [
  {
    name: "redeclare export",
    inputs: {
      "foo.tsx": `
          export namespace Foo {
            export function bar() {
              return 5;
            }

            export function baz() {
              return 5;
            }

            export type Thing = string;

            export interface Props {
              what: Thing;
            }
          }
        `,

      "index.ts": `
          export {Foo} from "./foo";
      `,
    },
  },
  {
    name: "redeclare export w funky names",
    inputs: {
      "foo.tsx": `
          export namespace FooBar {
            export type ThingBar = string;

            export const doFoo = () => 5;

            export const VAR_BAR = 5;
          }
        `,

      "index.ts": `
          export {FooBar} from "./foo";
      `,
    },
  },
  {
    name: "doesnt clobber component exports",
    inputs: {
      "foo.tsx": `
          export namespace Foo {
              export interface Props { what: number }
          }

          export class Foo extends React.Component<Foo.Props> {

          }
      `,
      "index.ts": `
          export {Foo} from "./foo";
      `,
    },
  },
  {
    name: "function invoke within namespace",
    inputs: {
      "foo.tsx": `
          export namespace Foo {
            export function bar() {
              baz();
            }

            export function baz() {
              return 5;
            }
          }
        `,
    },
  },
  {
    name: "combined types",
    inputs: {
      "foo.tsx": `
          export namespace AssociatedMapSection {
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
    },
  },
  {
    name: "works nicely with interfaces",
    // We cant break foo out in this case cause im too lazy to implement this another way.
    inputs: {
      "foo.tsx": `
          export namespace Foo {
              export interface Props { what: number }
          }

          class Foo extends React.Component<Foo.Props> {

          }
      `,
      "index.ts": `
          export {Foo} from "./foo";
      `,
    },
  },
  {
    name: "dont explode if error",
    // We cant break foo out in this case cause im too lazy to implement this another way.
    inputs: {
      "foo.ts": `
          const foo = 5;
          
          export namespace Wat {
              export const foo = 6;
          }
            `,
    },
  },
  {
    name: "simple",
    inputs: {
      "foo.ts": `
        const foo = 5;
        
        export namespace Wat {
          export const aasdf = 3;
          export const second = 5;

          export const thirdSpaced = 56;

          // Foo
          export const fourthWithComment = 555;
        }
        `,
    },
  },
  {
    name: "rename in other file",
    inputs: {
      "wat.ts": `
          export namespace Wat {
            export const key = 3;
            export function f() { return 5; }

            export class Foo {}

            export type Baz = string;
          }
        `,

      "refWat.ts": `
          import {Wat} from "./wat";

          console.log(Wat.key);
          console.log(Wat.f());
          console.log(new Wat.Foo());
          const f: Wat.Baz = "hi";
        `,
    },
  },
  {
    name: "Conflicting imports work",
    inputs: {
      "foo.ts": `
          export namespace Foo { export type Props = { hi: "mom" }}
      `,
      "bar.ts": `
          export namespace Bar { export type Props = { hi: "mom" }}
      `,
      "baz.ts": `
          import {Foo} from "./foo";
          import {Bar} from "./bar";
          export type Props = Foo.Props & Bar.Props;

      `,
    },
  },
  {
    name: "Generics work",
    inputs: {
      "foo.ts": `
          export namespace MapElementViewerProperties {
            export interface OwnProps<T extends MapElement> {
              mapElement: T;
              locked: boolean;
              section: RightMapPanelType;
            }
          
            export interface StoreProps {
              mapDataState: MapDataState;
            }
          
            export interface NectarProps {
              dispatch: Dispatch;
            }
          
            export type Props<T extends MapElement> = OwnProps<T> & StoreProps & NectarProps;
          }
      `,
      "bar.ts": `
          import {MapElementViewerProperties} from "./foo";

          export type Foo<T extends MapElement> = MapElementViewerProperties.OwnProps<T>;
      `,
    },
  },
];

describe("processProject", () => {
  it.each(cases)("$name", async ({ inputs, name }) => {
    const logger = createTestLogger(name);
    try {
      const project = new Project({
        useInMemoryFileSystem: true,
        skipAddingFilesFromTsConfig: true,
      });
      for (const [name, contents] of Object.entries(inputs)) {
        project.createSourceFile(name, formatTestTypescript(contents));
      }
      project.saveSync();

      await processProject(project, {
        logger,
      });

      const fs = project.getFileSystem();

      const output = project
        .getSourceFiles()
        .map((sf) => {
          const filePath = sf.getFilePath();
          return formatTestTypescript(
            `
        //

        //
        // PATH: '${filePath}'
        //
        ${fs.readFileSync(filePath)}
        `
          );
        })
        .join();

      expect(output).toMatchSnapshot();
    } finally {
      logger.flush();
    }
  });
});

function createTestLogger(name: string) {
  return pino(
    {
      level: "trace",
      serializers: {
        ...pino.stdSerializers,
        foo: (n: Node) => `${n.getSourceFile().getFilePath()}:${n.getStartLineNumber()}`,
      },
      hooks: {
        logMethod: function logMethod([msg, ...args], method, _foo) {
          args = args.map((a) => maybeConvertNodeToFileAndLineNum(a));
          // console.log([msg, ...args]);
          method.apply(this, [msg, ...args]);
        },
      },
    },
    pino.multistream([
      {
        level: "trace",
        stream: pino.destination({
          sync: true,
          mkdir: true,
          dest: `logs/processProject/${name}.log.json`,
        }),
      },
      {
        level: "trace",
        stream: pinoPretty.default({
          colorize: false,
          sync: true,
          singleLine: false,
          destination: pino.destination({
            sync: true,
            mkdir: true,
            append: false,
            dest: `logs/processProject/${name}.log.txt`,
          }),
        }),
      },
    ])
  );
}

function maybeConvertNodeToFileAndLineNum(a: any): any {
  if (a instanceof Node) {
    return `${a.getSourceFile().getFilePath()}:${a.getStartLineNumber()}`;
  }

  return a;
}
