import { describe, expect, it } from "@jest/globals";
import { createTestLogger, createProjectForTest, formatTestTypescript } from "@eartool/test-utils";
import { processProject, type ProcessProjectOpts } from "./processProject.js";

const cases: {
  name: string;
  inputs: Record<string, string>;
  additionalRenames?: ProcessProjectOpts["additionalRenames"];
  removeNamespaces?: ProcessProjectOpts["removeNamespaces"];
  removeFauxNamespaces?: ProcessProjectOpts["removeFauxNamespaces"];
  organizeImports?: ProcessProjectOpts["organizeImports"];
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
  {
    name: "Doesn't produce extra import statements",
    inputs: {
      "foo.ts": `
        export namespace Foo {
          export function create() {}
          export function other() {}
        }

        export interface Foo {
          readonly foo: string;
        }
      `,
      "bar.ts": `
        import {Foo} from "./foo";

        doStuff(Foo.create());
        doStuff(Foo.create());
        doStuff(Foo.other());
      `,
    },
    removeNamespaces: true,
    organizeImports: false,
  },
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
  //Selectors as WatchedCasesSelectors,
  {
    name: "Fixes export star",
    inputs: {
      "index.ts": `
        export { Stuff } from "./stuff";
      `,
      "inbox/Inbox.ts": `
        import {Selectors as CaseSelectors} from "./cases";

        CaseSelectors.doStuff();
      `,
      "cases/index.ts": `
        export * from "./selectors";
      `,
      "cases/selectors.ts": `
        export namespace Selectors {
          export const doStuff = () => 5;
        }
      `,
    },
  },
  {
    name: "Fixes the exported type",
    inputs: {
      "index.ts": `
        export { Stuff } from "./stuff";
      `,
      "thing/index.ts": `
        import {Stuff} from "../stuff";

        Stuff.getInitialState();
      `,
      "stuff/index.ts": `
        export interface Stuff {
          hi: string;
        }
        export namespace Stuff {
          export const getInitialState = defaultMemoize((): Stuff => {
            return {
              "hi": "mom"
            };
          });
        }
      `,
    },
  },
  {
    name: "Doesnt export as type just because there is extra info",
    inputs: {
      "index.ts": `
        export { Stuff } from "./stuff";
      `,
      "thing/index.ts": `
        import {Stuff} from "../stuff";

        Stuff.getInitialState();
      `,
      "stuff/index.ts": `
        export interface Unrelated {}
        export class Stuff {
        }
        export namespace Stuff {
          export const getInitialState = defaultMemoize((): Stuff => {
            return {
              "hi": "mom"
            };
          });
        }

      `,
    },
  },
  {
    name: "Doesnt mess up indirect imports",
    inputs: {
      "index.ts": `
        import {Selectors} from "./cases";
        export const foo = Selectors.doStuff();
      `,
      "cases/index.ts": `
        export * from "./selectors";
      `,
      "cases/selectors.ts": `
        export namespace Selectors {
          export const doStuff = () => 5;
        }
      `,
    },
  },
  {
    name: "Enums rename properly",
    inputs: {
      "index.ts": `
      `,
      "dialog.ts": `
        export type DialogMode = A | B;

        export namespace DialogMode {
          export enum Type {
            A = "A",
            B = "B",
          }
        

          export function isA(dialog: DialogMode): dialog is A {
            // Fully qualified
            return dialog.type === DialogMode.Type.A;
          }
          
          export function isB(dialog: DialogMode): dialog is B {
            // Local to namespace
            return dialog.type === Type.B
          }
        }

        export interface A {
          type: DialogMode.Type.A
        }
        
        export interface B {
          type: DialogMode.Type.B
          onConfirm: () => void;
        }        
      `,
    },
  },
  {
    name: "Twins in namespace",
    inputs: {
      "index.ts": `
        export interface State {}
        export namespace State {
          export const ROOT_KEY = "state";
          export type ROOT_KEY = typeof ROOT_KEY;
        }
      `,
    },
  },
  {
    name: "reexports only alias a single time",
    inputs: {
      "index.ts": `export {Main} from "./main";`,
      "main/index.ts": `export {Main} from "./Main";`,
      "main/Main.ts": `
        export namespace Main {
          export interface Props {

          }
        }
        export class MainInternal extends React.Component {}
        export const Main = connect()(MainInternal);
      `,
    },
  },
];

describe("processProject", () => {
  it.each(cases)(
    "$name",
    async ({
      inputs,
      additionalRenames,
      removeFauxNamespaces,
      removeNamespaces,
      organizeImports,
    }) => {
      const logger = createTestLogger();
      try {
        const project = createProjectForTest(inputs);

        await processProject(
          { project, logger, packageName: "foo", packagePath: "/", packageJson: {} },
          {
            logger,
            additionalRenames,
            removeFauxNamespaces: removeFauxNamespaces ?? true,
            dryRun: false,
            organizeImports: organizeImports ?? true,
            removeNamespaces: removeNamespaces ?? true,
          }
        );

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

    const result = await processProject(
      { project, logger, packageName: "foo", packagePath: "/", packageJson: {} },
      {
        logger,
        removeNamespaces: true,
        removeFauxNamespaces: false,
        dryRun: false,
        organizeImports: true,
      }
    );
    expect(result.exportedRenames).toHaveLength(1);
    expect(result.exportedRenames[0]).toEqual({ from: ["Foo", "Props"], to: ["FooProps"] });
  });
});
