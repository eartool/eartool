export interface Progress {
  setProjectCount(count: number): void;
  addProject(name: string): void;
  updateProject(name: string, completed: number, total: number, stage: string): void;
  completeProject(name: string): void;
  stop(): void;
}
