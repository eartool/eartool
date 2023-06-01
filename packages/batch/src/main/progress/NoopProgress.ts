import type { Progress } from "./Progress.js";

export class NoopProgress implements Progress {
  setProjectCount(count: number): void {
    /* noop */
  }
  addProject(name: string): void {
    /* noop */
  }
  updateProject(name: string, completed: number, total: number, stage: string): void {
    /* noop */
  }
  completeProject(name: string): void {
    /* noop */
  }
  stop(): void {
    /* noop */
  }
}
