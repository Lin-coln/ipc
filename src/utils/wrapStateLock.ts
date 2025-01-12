type LockState<
  This extends Record<string, any>,
  Field extends string,
> = Field extends keyof This ? This[Field] : never;

export default function wrapStateLock<
  Field extends string,
  This extends Record<string, any>,
  Args extends any[],
  R extends any,
>(
  fn: (this: This, ...args: Args) => Promise<R>,
  opts: {
    field: Field;
    states: [
      LockState<This, Field> | LockState<This, Field>[],
      LockState<This, Field>,
      LockState<This, Field>,
    ];
  },
): (this: This, ...args: Args) => Promise<R> {
  const { field, states } = opts;
  let [prevList, tar, next] = states;
  if (!Array.isArray(prevList)) {
    prevList = [prevList];
  }

  return function (this: This, ...args: Args) {
    if (!prevList.includes(this[field])) {
      throw new Error(`[state lock] invalid state - ${field}: ${this[field]}`);
    }
    const prev = this[field];
    this[field] = tar;
    const promise = new Promise<R>((resolve, reject) => {
      try {
        fn.apply(this, args).then(resolve, reject);
      } catch (e) {
        reject(e);
      }
    }).then(
      (r) => {
        this[field] = next;
        return r;
      },
      (e) => {
        this[field] = prev;
        throw e;
      },
    );

    return promise;
  };
}
