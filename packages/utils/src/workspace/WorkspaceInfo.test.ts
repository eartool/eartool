import { describe, it, expect } from "@jest/globals";
import { Workspace } from "./WorkspaceInfo.js";

describe(Workspace, () => {
  describe("getPackageDirection", () => {
    it("works", () => {
      const workspace = new Workspace();
      const foo = workspace.addPackage("foo", "/foo");
      const bar = workspace.addPackage("bar", "/bar");
      const baz = workspace.addPackage("baz", "/baz");
      const _other = workspace.addPackage("other", "/other");

      // arrow shows dependsOn (opposite of stream'ness)
      // foo -> baz -> bar
      foo.addDependency(baz);
      baz.addDependency(bar);

      expect(workspace.getPackageDirection("foo", "baz")).toBe("upstream");
      expect(workspace.getPackageDirection("foo", "bar")).toBe("upstream");
      expect(workspace.getPackageDirection("foo", "other")).toBe("sideways");

      expect(workspace.getPackageDirection("baz", "foo")).toBe("downstream");
      expect(workspace.getPackageDirection("baz", "bar")).toBe("upstream");
      expect(workspace.getPackageDirection("baz", "other")).toBe("sideways");

      expect(workspace.getPackageDirection("bar", "foo")).toBe("downstream");
      expect(workspace.getPackageDirection("bar", "baz")).toBe("downstream");
      expect(workspace.getPackageDirection("bar", "other")).toBe("sideways");

      expect(workspace.getPackageDirection("other", "foo")).toBe("sideways");
      expect(workspace.getPackageDirection("other", "bar")).toBe("sideways");
      expect(workspace.getPackageDirection("other", "baz")).toBe("sideways");
    });
  });

  describe("runTasks", () => {
    it("runs things in order correctly", async () => {
      const workspace = new Workspace();
      const foo = workspace.addPackage("foo", "/foo");
      const bar = workspace.addPackage("bar", "/bar");
      const baz = workspace.addPackage("baz", "/baz");

      // foo -> baz -> bar
      foo.addDependency(baz);
      baz.addDependency(bar);

      const order: string[] = [];
      await workspace.runTasks([] /*all*/, "upstreamFirst", 6, async (args) => {
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
      await workspace.runTasks([bar], "upstreamFirst", 6, async (args) => {
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

      const q = [...workspace.walkTreeDownstreamFrom(bar)];
      expect(q.map((a) => a.name)).toEqual(["bar", "foo"]);
    });
  });
});
