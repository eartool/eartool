import { describe, it } from "@jest/globals";
import { Workspace } from "./WorkspaceInfo.js";
import { expect } from "@jest/globals";

describe(Workspace, () => {
  describe("runTasksInOrder", () => {
    it("runs things in order correctly", async () => {
      const workspace = new Workspace();
      const foo = workspace.addPackage("foo", "/foo");
      const bar = workspace.addPackage("bar", "/bar");
      const baz = workspace.addPackage("baz", "/baz");

      // foo -> baz -> bar
      foo.addDependency(baz);
      baz.addDependency(bar);

      const order: string[] = [];
      await workspace.runTasksInOrder(undefined, async (args) => {
        order.push(args.packageName);
      });

      expect(order).toEqual(["bar", "baz", "foo"]);
    });

    it("handles starting in the middle", async () => {
      const workspace = new Workspace();
      const foo = workspace.addPackage("foo", "/foo");
      const bar = workspace.addPackage("bar", "/bar");
      const baz = workspace.addPackage("baz", "/baz");

      foo.addDependency(bar);
      foo.addDependency(baz);

      const order: string[] = [];
      await workspace.runTasksInOrder(bar, async (args) => {
        order.push(args.packageName);
      });

      expect(order).toEqual(["bar", "foo"]);
    });
  });

  describe("walkTreeDownstreamFromName", () => {
    it("works", () => {
      const workspace = new Workspace();
      const foo = workspace.addPackage("foo", "/foo");
      const bar = workspace.addPackage("bar", "/bar");
      const baz = workspace.addPackage("baz", "/baz");

      foo.addDependency(bar);
      foo.addDependency(baz);

      const q = [...workspace.walkTreeDownstreamFromName(bar)];
      expect(q.map((a) => a.name)).toEqual(["bar", "foo"]);
    });
  });
});
