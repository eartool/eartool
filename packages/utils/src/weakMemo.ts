export function weakMemo<T extends object, R>(f: (arg: T) => R) {
  const a = new WeakMap<T, R>();

  return function(arg: T) {
    if (a.has(arg)) return a.get(arg)!;
    const ret = f(arg);
    a.set(arg, ret);
    return ret;
  };
}
