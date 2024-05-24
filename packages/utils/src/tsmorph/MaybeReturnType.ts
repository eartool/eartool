export type MaybeReturnType<T, K extends keyof T> = T[K] extends (...args: any[]) => infer R ? R
  : never;
