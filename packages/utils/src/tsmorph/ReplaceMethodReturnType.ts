import type { MaybeReturnType } from "./MaybeReturnType.js";

export type ReplaceMethodReturnType<
  T extends {},
  K extends keyof T,
  V extends MaybeReturnType<T, K>
> = Omit<T, K> & {
  [k in K]: () => V;
};
