export default function wrapSinglePromise<
  This,
  Args extends any[],
  R extends any,
>(
  fn: (this: This, ...args: Args) => Promise<R>,
  resolveId?: (this: This, ...args: Args) => string,
): (this: This, ...args: Args) => Promise<R> {
  const promises: Map<string, Promise<R>> = new Map();
  const resolver = resolveId ?? (() => "default");

  return function (this: This, ...args: Args) {
    const id: string = resolver.apply(this, args);
    if (promises.has(id)) return promises.get(id)!;
    const promise = new Promise<R>((resolve, reject) => {
      try {
        fn.apply(this, args).then(resolve, reject);
      } catch (e) {
        reject(e);
      }
    }).finally(() => {
      promises.delete(id);
    });
    promises.set(id, promise);
    return promises.get(id)!;
  };
}
