import { createProjectForTest, createTestLogger, formatTestTypescript } from "@eartool/test-utils";
import type { Project } from "ts-morph";
import { describe, expect, it } from "vitest";
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
            mapConfig: Config;
          }
        
          export interface State {
            map?: Map;
            user?: User;
            isLoading: boolean;
          }
        
          export type Props = State & OgreProps & ReduxProps;
        }
      `,
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
        
        export function Wat(){}
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
      export function Wat() {}

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

        console.log(Foo.create());
        console.log(Foo.create());
        console.log(Foo.other());
      `,
    },
    removeNamespaces: true,
    organizeImports: false,
  },
  {
    name: "Handles local variable name collisions inside functions",
    inputs: {
      "sourceInstances.ts": `
        import { SourceInstance } from "./sourceInstance";

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
      "sourceInstance.ts": `
        export interface SourceInstance{}
      `,
    },
  },
  // Selectors as WatchedCasesSelectors,
  {
    name: "Fixes export star",
    inputs: {
      "index.ts": `
        export { Stuff } from "./stuff";
      `,
      "stuff.ts": `
        export const foo = 5;
      `,
      "inbox/Inbox.ts": `
        import {Selectors as CaseSelectors} from "./cases/index.ts";

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
  {
    name: "Properly updates outer and inner",
    inputs: {
      "index.ts": `
        export namespace Outer {
          export interface Props {
            slides: readonly Outer.Inner.Props[];
          }
        
          export namespace Inner {
            export interface Props {
              index: number;
            }
          }
        }
        
        export const Outer = 5;
      `,
    },
  },
  {
    name: "Properly handles the reference with the unwrap case when outside",
    inputs: {
      "index.ts": `
        export {Outer} from "./foo";
      `,
      "foo.ts": `
        export namespace Outer {
          export interface Options {
            api: string;
          }
        
          export function run(options: Options) {
            
          }
        }
        
        interface Foo {
        
        }
        
        function doStuff(): Outer.Options {
          return {
            api: 'foo',
          }
        }
      `,
    },
  },
  {
    name: "Properly handles the reference with the unwrap case when inside",
    inputs: {
      "index.ts": `
        export namespace Foo {

          export const inner = {
            bleh: (value:string) => 5,
            other: (value: string) => 6
          };

          
          export function asdf(value: string) {
            return value != null ? Foo.inner.bleh(value) : undefined;
          }
        }
`,
    },
  },
  {
    name: "Doesnt duplicate the exports from root",
    inputs: {
      "index.ts": `
        export {Foo} from "./foo";
      `,
      "foo.ts": `
        export namespace Foo {
          export const FOO = 5;
          export type FOO = typeof FOO;
        }
        export const other = 5;
      `,
    },
    organizeImports: false,
  },
  {
    name: "Doesnt try to reexport an inner interface that wasnt exported",
    inputs: {
      "index.ts": `
        export {Outer} from "./foo";
      `,
      "foo.ts": `
        export function Outer() {}
        export namespace Outer {
          interface DOntExport {
            foo: number;
          }

          export interface Exported extends DOntExport {
            bar: number;
          }
        }
      `,
    },
  },
  {
    name: "Doesnt try to reexport an inner const that wasnt exported",
    inputs: {
      "index.ts": `
        export {Outer} from "./foo";
      `,
      "foo.ts": `
        export namespace Outer {
          const dontExportThis = 5;

          export interface Exported {
            bar: typeof dontExportThis;
          }
        }
        export interface Outer {}
      `,
    },
  },
  {
    name: "Dont reexport the wrong things in mixed case 1",
    inputs: {
      "index.ts": `
        export {Outer} from "./foo";
      `,
      "foo.ts": `
        export interface Outer {

        }
        export namespace Outer {
          function dontExportThis() {}
          interface DontThinkAboutIt {}

          export interface Exported {
            bar: typeof dontExportThis;
          }
        }
        
      `,
    },
  },
  {
    name: "Dont mix up export styles",
    inputs: {
      "index.ts": `
        export type {Outer} from "./foo";
      `,
      "foo.ts": `
        export interface Outer {
        }
        export namespace Outer {
          export interface Exported {
            bar: number;
          }
        }
      `,
    },
    organizeImports: false,
  },
  {
    name: "Works with method references",
    inputs: {
      "index.ts": `
        export namespace Foo {
          export function bar(): void;
          export function bar(value: string): string;
          export function bar() {
            
          }
        }
      `,
    },
    organizeImports: false,
  },
  {
    name: "Double reexport check",
    inputs: {
      "index.ts": `
        export type {Result as Type} from "./result";
      `,
      "result.ts": `
        export type Result<T, E = Error> = Result.Ok<T> | Result.Err<E>;

        export namespace Result {
          export interface Ok<T> {
            readonly type: "ok";
            readonly ok: T;
          }
        
          export interface Err<E> {
            readonly type: "err";
            readonly err: E;
          }
        }
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
        const project = await createProjectForTest(inputs);

        await processProject(
          { project, logger, packageName: "foo", packagePath: "/", packageJson: {} },
          {
            logger,
            additionalRenames,
            removeFauxNamespaces: removeFauxNamespaces ?? true,
            dryRun: false,
            organizeImports: organizeImports ?? true,
            removeNamespaces: removeNamespaces ?? true,
          },
        );

        const output = await calculateOutput(project);

        expect(output).toMatchSnapshot();
      } finally {
        logger.flush();
      }
    },
  );

  it("handles deeply nested reexports", async () => {
    const logger = createTestLogger();

    const project = await createProjectForTest({
      "foo.ts": `
        export namespace Foo {
          export type Props = {};
        }
        export function Foo(){}
      `,
      "bar.ts": `
        export * as Bar from "./foo";
      `,
      "other.ts": `
        export * from "./bar";
        export * as Bleh from "./bar";
      `,
      "index.ts": `
          export {Foo} from "./foo";
          export * from "./other";
      `,
    });

    const result = await processProject(
      { project, logger, packageName: "foo", packagePath: "/", packageJson: {} },
      {
        logger,
        // additionalRenames: {},
        removeFauxNamespaces: false,
        dryRun: false,
        organizeImports: false,
        removeNamespaces: true,
      },
    );

    expect(result.exportedRenames).toMatchInlineSnapshot(`
      [
        {
          "from": [
            "Foo",
            "Props",
          ],
          "to": [
            "FooProps",
          ],
        },
        {
          "from": [
            "Bar",
            "Foo",
            "Props",
          ],
          "to": [
            "Bar",
            "Props",
          ],
        },
        {
          "from": [
            "Bleh",
            "Bar",
            "Foo",
            "Props",
          ],
          "to": [
            "Bleh",
            "Bar",
            "Props",
          ],
        },
      ]
    `);

    const output = await calculateOutput(project);
    expect(output).toMatchInlineSnapshot(`
      "//

      //
      // PATH: '/bar.ts'
      //
      export * as Bar from "./foo";
      ,//

      //
      // PATH: '/foo.ts'
      //

      export type Props = {};

      export function Foo() {}
      ,//

      //
      // PATH: '/index.ts'
      //
      export { type Props as FooProps } from "./foo";
      export { Foo } from "./foo";
      export * from "./other";
      ,//

      //
      // PATH: '/other.ts'
      //
      export * from "./bar";
      export * as Bleh from "./bar";
      "
    `);
  });

  it("records renames from root", async () => {
    const logger = createTestLogger();

    const project = await createProjectForTest({
      "foo.ts": `
        export namespace Foo {
          export type Props = {};
        }
        export function Foo(){}
      `,
      "bar.ts": `
        export namespace Bar {
          export interface Props {}
        }
        export function Bar() {}
      `,
      "index.ts": `
          export {Foo} from "./foo";
          export * from "./bar";
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
      },
    );

    expect(result.exportedRenames).toMatchInlineSnapshot(`
      [
        {
          "from": [
            "Bar",
            "Props",
          ],
          "to": [
            "Props",
          ],
        },
        {
          "from": [
            "Foo",
            "Props",
          ],
          "to": [
            "FooProps",
          ],
        },
      ]
    `);
  });

  it("doesnt reexport renames twice", async () => {
    const logger = createTestLogger();

    const project = await createProjectForTest({
      "foo.ts": `
          export interface Foo {}
          export namespace Foo {
            export type Bar = string;
            export namespace Bar {
              export const of = () => 5;
            }
          }
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
        organizeImports: false,
      },
    );
    expect(result.exportedRenames).toHaveLength(1);
    expect(result.exportedRenames[0]).toEqual({ from: ["Foo", "Bar"], to: ["BarForFoo"] });
  });

  it("calculates the export correctly if index was renamer", async () => {
    const logger = createTestLogger();

    const project = await createProjectForTest({
      "foo.ts": `
          export type Foo = Foo.Bar | Foo.Baz
          export namespace Foo {
            export type Bar = string;
            export type Baz = number;
          }
      `,
      "index.ts": `
          export {Foo as Type} from "./foo";
      `,
    });

    const result = await processProject(
      { project, logger, packageName: "foo", packagePath: "/", packageJson: {} },
      {
        logger,
        removeNamespaces: true,
        removeFauxNamespaces: false,
        dryRun: false,
        organizeImports: false,
      },
    );

    const output = await calculateOutput(project);
    expect(output).toMatchInlineSnapshot(`
      "//

      //
      // PATH: '/foo.ts'
      //
      export type Foo = BarForFoo | BazForFoo;

      export type BarForFoo = string;
      export type BazForFoo = number;
      ,//

      //
      // PATH: '/index.ts'
      //
      export { type BarForFoo } from "./foo";
      export { type BazForFoo } from "./foo";
      export { type Foo as Type } from "./foo";
      "
    `);

    expect(result.exportedRenames).toMatchInlineSnapshot(`
      [
        {
          "from": [
            "Type",
            "Bar",
          ],
          "to": [
            "BarForFoo",
          ],
        },
        {
          "from": [
            "Type",
            "Baz",
          ],
          "to": [
            "BazForFoo",
          ],
        },
      ]
    `);
  });

  it("calculates renames correctly when export star has a twin", async () => {
    const logger = createTestLogger();

    const project = await createProjectForTest({
      "foo.ts": `
          export interface Foo {}
          export namespace Foo {
            export type Bar = string;
            export namespace Bar {
              export const of = () => 5;
            }
          }
      `,
      "index.ts": `
          export * from "./foo";
      `,
    });

    const result = await processProject(
      { project, logger, packageName: "foo", packagePath: "/", packageJson: {} },
      {
        logger,
        removeNamespaces: true,
        removeFauxNamespaces: false,
        dryRun: false,
        organizeImports: false,
      },
    );

    expect(result.exportedRenames).toHaveLength(1);
    expect(result.exportedRenames[0]).toEqual({ from: ["Foo", "Bar"], to: ["BarForFoo"] });
  });

  it("calculates renames correctly when export star has no twin", async () => {
    const logger = createTestLogger();

    const project = await createProjectForTest({
      "foo.ts": `
          export interface Bleh {}
          export namespace Foo {
            export type Bar = string;
            export namespace Bar {
              export const of = () => 5;
            }
          }
      `,
      "index.ts": `
          export * from "./foo";
      `,
    });

    const result = await processProject(
      { project, logger, packageName: "foo", packagePath: "/", packageJson: {} },
      {
        logger,
        removeNamespaces: true,
        removeFauxNamespaces: false,
        dryRun: false,
        organizeImports: false,
      },
    );

    expect(result.exportedRenames).toHaveLength(1);
    expect(result.exportedRenames[0]).toEqual({ from: ["Foo", "Bar"], to: ["BarForFoo"] });
  });

  it("doesnt mess up in package replacements for duplicated type and const in namespace", async () => {
    const logger = createTestLogger();

    const project = await createProjectForTest({
      "foo.ts": `
        export namespace FiltersExtension {
          export type DEFER = string & {
            brand: "defer";
          };
        
          export const DEFER: DEFER = "DEFER" as DEFER;
        }
        export const somethingElse = 5;
      `,
      "index.ts": `
        export { FiltersExtension } from "./foo";
      `,
      "other.ts": `
        import {FiltersExtension} from "./foo";

        export type Bleh = FiltersExtension.DEFER;
        export const bleh = FiltersExtension.DEFER;
      `,
    });

    const result = await processProject(
      { project, logger, packageName: "foo", packagePath: "/", packageJson: {} },
      {
        logger,
        removeNamespaces: true,
        removeFauxNamespaces: false,
        dryRun: false,
        organizeImports: false,
      },
    );

    const output = await calculateOutput(project);
    expect(output).toMatchInlineSnapshot(`
      "//

      //
      // PATH: '/foo.ts'
      //

      export type FILTERS_EXTENSION_DEFER = string & {
        brand: "defer";
      };

      export const FILTERS_EXTENSION_DEFER: FILTERS_EXTENSION_DEFER =
        "DEFER" as FILTERS_EXTENSION_DEFER;

      export const somethingElse = 5;
      ,//

      //
      // PATH: '/index.ts'
      //
      export { FILTERS_EXTENSION_DEFER } from "./foo";
      export {} from "./foo";
      ,//

      //
      // PATH: '/other.ts'
      //
      import { FILTERS_EXTENSION_DEFER, FiltersExtension } from "./foo";

      export type Bleh = FILTERS_EXTENSION_DEFER;
      export const bleh = FILTERS_EXTENSION_DEFER;
      "
    `);

    expect(result.exportedRenames).toMatchInlineSnapshot(`
      [
        {
          "from": [
            "FiltersExtension",
            "DEFER",
          ],
          "to": [
            "FILTERS_EXTENSION_DEFER",
          ],
        },
      ]
    `);
  });

  it("calculates renames correctly when export star has two twins", async () => {
    const logger = createTestLogger();

    const project = await createProjectForTest({
      "foo.ts": `
        import { OneOrMultiple } from "helpers";
        export const MyEvent = {
          NAME: "MyEvent",
        } as const;
        export namespace MyEvent {
          export interface Payload {
            readonly id: OneOrMultiple<string>;
          }
        }
        
        export type MyEvent = CustomEvent<MyEvent.Payload>;
        
        export function emitMyEvent(id: OneOrMultiple<string>): void {
          const event = new CustomEvent(MyEvent.NAME, { detail: { id } });
          window.dispatchEvent(event);
        }
      `,
      "index.ts": `
        export {
          emitMyEvent,
          MyEvent,
        } from "./foo";
      `,
    });

    const result = await processProject(
      { project, logger, packageName: "foo", packagePath: "/", packageJson: {} },
      {
        logger,
        removeNamespaces: true,
        removeFauxNamespaces: false,
        dryRun: false,
        organizeImports: false,
      },
    );

    const output = await calculateOutput(project);
    expect(output).toMatchInlineSnapshot(`
      "//

      //
      // PATH: '/foo.ts'
      //
      import { OneOrMultiple } from "helpers";
      export const MyEvent = {
        NAME: "MyEvent",
      } as const;

      export interface PayloadForMyEvent {
        readonly id: OneOrMultiple<string>;
      }

      export type MyEvent = CustomEvent<PayloadForMyEvent>;

      export function emitMyEvent(id: OneOrMultiple<string>): void {
        const event = new CustomEvent(MyEvent.NAME, { detail: { id } });
        window.dispatchEvent(event);
      }
      ,//

      //
      // PATH: '/index.ts'
      //
      export { type PayloadForMyEvent } from "./foo";
      export { emitMyEvent, MyEvent } from "./foo";
      "
    `);

    expect(result.exportedRenames).toMatchInlineSnapshot(`
      [
        {
          "from": [
            "MyEvent",
            "Payload",
          ],
          "to": [
            "PayloadForMyEvent",
          ],
        },
      ]
    `);
  });
});

async function calculateOutput(project: Project) {
  const fs = project.getFileSystem();

  const output = (
    await Promise.all(
      project.getSourceFiles().map((sf) => {
        const filePath = sf.getFilePath();
        return formatTestTypescript(
          `
        //

        //
        // PATH: '${filePath}'
        //
        ${fs.readFileSync(filePath)}
        `,
        );
      }),
    )
  ).join();
  return output;
}
