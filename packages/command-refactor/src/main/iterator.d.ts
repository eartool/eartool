declare module "core-js-pure/actual/iterator/index.js" {
  class Iterator<T> implements IterableIterator<T> {
    // static from<X, Y>(iteratble: ReadonlyMap<X, Y>): Iterator<[X, Y]>;
    static from<T>(iterable: Iterable<T> | IterableIterator<T>): Iterator<T>;

    map<R>(arg0: (a: T) => R): Iterator<R>;
    filter<Z>(arg0: (a: T) => a is Z): Iterator<Z>;
    filter(arg0: (a: T) => boolean): Iterator<T>;
    toArray(): T[];

    flatMap<U, This = undefined>(
      callback: (this: This, value: T, index: number) => Iterable<U>,
      thisArg?: This,
    ): Iterator<U>;

    [Symbol.toStringTag]: "Iterator";
    [Symbol.iterator](): IterableIterator<T>;
  }

  export default Iterator;
}
