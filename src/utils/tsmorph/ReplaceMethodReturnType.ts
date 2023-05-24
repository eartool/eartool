import type { MaybeReturnType } from "./MaybeReturnType.js";

export type ReplaceMethodReturnType<
  // eslint-disable-next-line @typescript-eslint/ban-types
  T extends {},
  K extends keyof T,
  V extends MaybeReturnType<T, K>
> = Omit<T, K> & {
  [k in K]: () => V;
};
