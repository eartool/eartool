import { describe, expect, it } from "@jest/globals";
import { processProject, type ProcessProjectOpts } from "./processProject.js";
import { createTestLogger, createProjectForTest, formatTestTypescript } from "@eartool/test-utils";

const cases: {
  name: string;
  inputs: Record<string, string>;
  additionalRenames?: ProcessProjectOpts["additionalRenames"];
  removeNamespaces?: ProcessProjectOpts["removeNamespaces"];
  removeFauxNamespaces?: ProcessProjectOpts["removeFauxNamespaces"];
}[] = [
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

            export interface OtherThing {
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
    name: "redeclare export with ordering",
    inputs: {
      "foo.tsx": `
          export namespace Foo {
            export interface Thing {
              what: Thing;
            }
          }
        `,

      "index.ts": `
      export const before = 5;
          export {Foo} from "./foo";
          export const after = 5;
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
          export function Foo() {}
        `,
    },
  },
  {
    name: "function invoke within namespace exclusive",
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
        export function Wat(){}
        `,
    },
  },
  {
    name: "simple exclusive",
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
    name: "rename in other file non-exclusive",
    inputs: {
      "wat.ts": `
          export namespace Wat {
            export const key = 3;
            export function f() { return 5; }

            export class Foo {}

            export type Baz = string;
          }
          export function Wat() {}
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
    name: "rename in other file exclusive",
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
    name: "Conflicting imports work non-exclusive",
    inputs: {
      "foo.ts": `
          export namespace Foo { export type Props = { hi: "mom" }}
          export function Foo() {}
      `,
      "bar.ts": `
          export namespace Bar { export type Props = { hi: "mom" }}
          export function Bar() {}
      `,
      "baz.ts": `
          import {Foo} from "./foo";
          import {Bar} from "./bar";
          export type Props = Foo.Props & Bar.Props;

      `,
    },
  },
  {
    name: "Conflicting imports work exclusive",
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
    name: "Conflicting imports work mixed",
    inputs: {
      "foo.ts": `
          export namespace Foo { export type Props = { hi: "mom" }}
          export function Foo() {}
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
    name: "Simple additional renames work",
    inputs: {
      "foo.ts": `
          import {Foo} from "lib";
          export type MyProps = Foo.Props;
      `,
    },
    additionalRenames: new Map([["lib", [{ from: ["Foo", "Props"], to: ["FooProps"] }]]]),
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

          export function MapElementViewerProperties() {

          }
      `,
      "bar.ts": `
          import {MapElementViewerProperties} from "./foo";

          export type Foo<T extends MapElement> = MapElementViewerProperties.OwnProps<T>;
      `,
    },
  },
  {
    name: "Generics work with additional",
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

          export function MapElementViewerProperties() {}
      `,
      "bar.ts": `
          import {MapElementViewerProperties} from "./foo";
          import {Bleh} from "somelib"

          export type Foo<T extends MapElement & Bleh.Bar.Other> = MapElementViewerProperties.OwnProps<T>;
      `,
    },
    additionalRenames: new Map([
      ["somelib", [{ from: ["Bleh", "Bar", "Other"], to: ["Moo", "Cow"] }]],
    ]),
  },
  {
    name: "Handles const pattern nicely",
    inputs: {
      "index.ts": `
        export {Foo} from "./foo";
      `,
      "foo.ts": `
        export const Foo = {
          // direct function
          baz() {
            return 5; 
          },

          bar: () => {
            return 6;
          }
        } as const;
      `,
      "bar.ts": `
        import {Foo} from "./foo";

        console.log(Foo.bar());
        console.log(Foo.baz());
      `,
      "alias.ts": `
        import {Foo as Bar} from "./foo";

        console.log(Bar.bar());
        console.log(Bar.baz());
      `,
    },
  },
  {
    name: "Handles namespace like faux namespace when possible",
    inputs: {
      "index.ts": `
        export {Foo} from "./foo";
      `,
      "foo.ts": `
        export namespace Foo {
          // direct function
          export function baz() {
            return 5; 
          }

          export const bar = () => {
            return 6;
          }
        } 
      `,
      "bar.ts": `
        import {Foo} from "./foo";

        console.log(Foo.bar());
        console.log(Foo.baz());
      `,
      "alias.ts": `
        import {Foo as Bar} from "./foo";

        console.log(Bar.bar());
        console.log(Bar.baz());
      `,
    },
  },
  {
    name: "Doesn't change as const that has constnats",
    inputs: {
      "index.ts": `
        export {Foo} from "./foo";
      `,
      "foo.ts": `
        export const Foo = {
          // direct function
          baz() {
            return 5; 
          },

          bar: () => {
            return 6;
          },

          FOO: 7
        } as const;
      `,
    },
  },
  {
    name: "Handles in file references to faux namespaces",
    inputs: {
      "index.ts": `
        export {Foo} from "./foo";
      `,
      "foo.ts": `
        export const Foo = {
          // direct function
          baz() {
            return 5; 
          },

          bar: () => {
            return Foo.baz();
          },

          
        } as const;
      `,
    },
  },
  {
    name: "Renames import specifiers as needed",
    inputs: {
      "foo.ts": `
        import {bar} from "lib";
        import baz from "lib2";

        export const Foo = {
          // direct function
          baz() {
            return bar() + baz(); 
          },

          bar: () => {
            return Foo.baz();
          },

          
        } as const;
      `,
    },
  },
  {
    name: "Renames star imports as needed",
    inputs: {
      "foo.ts": `
        import {other} from "other";
        import * as otherStar from "other";
        import otherDefault from "other";

        import * as bar from "lib";

        export const Foo = {
          // direct function
          baz() {
            return bar.baz() + other + otherStar.foo + otherDefault; 
          },

          bar: () => {
            return Foo.baz();
          },

          
        } as const;
      `,
    },
  },
  {
    name: "Properly handles conflict with module local variable or function",
    inputs: {
      "foo.ts": `
        function bar() { return 5; }
        const baz = 5;

        export const Foo = {
          baz() {
            return baz; 
          },

          bar: () => {
            return bar();
          },
        } as const;
      `,
    },
  },
  {
    name: "Properly handles conflict with import",
    inputs: {
      "foo.ts": `
        import {bar} from "lib";

        export const Foo = {
          baz() {
            return baz; 
          },

          bar: () => {
            return bar();
          },
        } as const;
      `,
    },
  },
  {
    name: "Multiple things in the file",
    inputs: {
      "foo.ts": `
        export namespace MetadataValue {
          export type Foo = string;
        }

        export const MetadataValue = {
          doThing() {
            return 5;
          }
        }

        export function foo() {
          return 5;
        }
      `,
      "bar.ts": `
        import {MetadataValue, foo} from "./foo";

        console.log(MetadataValue.doThing());
        console.log(foo());
      `,
    },

    removeNamespaces: false,
  },
  /*
            
          */
  {
    name: "Handles local variable name collisions inside functions",
    inputs: {
      "sourceInstances.ts": `
        import { SourceInstance } from "../types/sourceInstance";

        interface FromArgs {
          readonly isFirst: boolean;
          readonly isLast: boolean;
        }

        export const SourceInstances = {
          isFirst(instance: SourceInstance) {
            return instance === SourceInstance.FIRST || instance === SourceInstance.ONLY;
          },

          isLast(instance: SourceInstance) {
            return instance === SourceInstance.LAST || instance === SourceInstance.ONLY;
          },

          from({ isFirst, isLast: reduce }: FromArgs) {
            if (isFirst) {
              return reduce ? SourceInstance.ONLY : SourceInstance.FIRST;
            } else {
              return reduce ? SourceInstance.LAST : SourceInstance.INNER;
            }
          },
          reduce(instance1: SourceInstance, instance2: SourceInstance) {
            const isFirst = SourceInstances.isFirst(instance1) && SourceInstances.isFirst(instance2);
            const isLast = SourceInstances.isLast(instance1) && SourceInstances.isLast(instance2);

            function from() { console.log(t) };
            from();
            return SourceInstances.from({ isFirst, isLast });
          },

        } as const;
      `,
    },
  },
];

describe("processProject", () => {
  it.each(cases)(
    "$name",
    async ({ inputs, additionalRenames, removeFauxNamespaces, removeNamespaces }) => {
      const logger = createTestLogger();
      try {
        const project = createProjectForTest(inputs);

        await processProject(project, {
          logger,
          additionalRenames,
          removeFauxNamespaces: removeFauxNamespaces ?? true,
          dryRun: false,
          organizeImports: true,
          removeNamespaces: removeNamespaces ?? true,
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
    }
  );

  it("records renames from root", async () => {
    const logger = createTestLogger();

    const project = createProjectForTest({
      "foo.ts": `
          export namespace Foo {
            export type Props = {};
          }
          export function Foo(){}
      `,
      "index.ts": `
          export {Foo} from "./foo";
      `,
    });

    const result = await processProject(project, {
      logger,
      removeNamespaces: true,
      removeFauxNamespaces: false,
      dryRun: false,
      organizeImports: true,
    });
    expect(result.exportedRenames).toHaveLength(1);
    expect(result.exportedRenames[0]).toEqual({ from: ["Foo", "Props"], to: ["FooProps"] });
  });
});