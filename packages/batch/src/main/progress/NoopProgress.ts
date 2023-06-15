import type { Progress } from "./Progress.js";

export class NoopProgress implements Progress {
  setProjectCount(_count: number): void {
    /* noop */
  }
  addProject(_name: string): void {
    /* noop */
  }
  updateProject(_name: string, _completed: number, _total: number, _stage: string): void {
    /* noop */
  }
  completeProject(_name: string): void {
    /* noop */
  }
  stop(): void {
    /* noop */
  }
}
