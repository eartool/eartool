import type { SingleBar } from "cli-progress";
import { MultiBar, Presets } from "cli-progress";
import * as Assert from "node:assert";
import type { Progress } from "./Progress.js";

export class RealProgress implements Progress {
  multibar: MultiBar;
  topBar: SingleBar;
  #projects: Map<string, SingleBar> = new Map();

  constructor() {
    this.multibar = new MultiBar(
      { format: " {bar} | {name} | {percentage}% {stage} | {eta_formatted}", fps: 2 },
      Presets.rect
    );
    this.topBar = this.multibar.create(100, 0, {
      name: "total package progress",
      stage: "",
    });
  }

  stop(): void {
    this.multibar.stop();
  }

  setProjectCount(count: number): void {
    this.topBar.setTotal(count);
  }

  addProject(name: string): void {
    Assert.ok(!this.#projects.has(name));
    this.#projects.set(
      name,
      this.multibar.create(100, 0, {
        name,
        stage: "initializing",
      })
    );
  }

  updateProject(name: string, completed: number, total: number, stage: string): void {
    const bar = this.#projects.get(name);
    Assert.ok(bar != null);

    bar.setTotal(total);
    bar.update(completed, { stage });
  }

  completeProject(name: string) {
    const bar = this.#projects.get(name);
    Assert.ok(bar != null);

    this.multibar.remove(bar);
    this.topBar.increment();
  }
}
