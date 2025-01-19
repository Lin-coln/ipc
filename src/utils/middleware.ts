export type Middleware<Args extends any[], R extends any, This = unknown> = (
  this: This,
  args: Args,
  next: () => R,
) => R;

export function withMiddleware<
  Args extends any[],
  R extends any,
  This = unknown,
>(
  fn: (this: This, ...args: Args) => R,
  ...middlewares: Middleware<Args, R, This>[]
): (this: This, ...args: Args) => R {
  if (!middlewares.length) return fn;

  if (middlewares.length === 1) {
    const mw = middlewares[0];
    return function (this: This, ...args: Args): R {
      const next = () => fn.apply(this, args);
      return mw.call(this, args, next);
    };
  }

  return middlewares.reduce((res, mw) => withMiddleware(res, mw), fn);
}

export function useArgsMiddleware<
  Args extends any[],
  R extends any,
  This = unknown,
>(modify: (args: Args) => Args | void): Middleware<Args, R, This> {
  return (args, next) => {
    const newArgs = modify(args);
    if (newArgs && args !== newArgs) {
      args.splice(0, args.length).push(...newArgs);
    }
    return next();
  };
}

export function useBeforeMiddleware<
  Args extends any[],
  R extends any,
  This = unknown,
>(onBefore: (args: Args) => unknown): Middleware<Args, R, This> {
  return (args, next) => {
    onBefore(args);
    return next();
  };
}

export function useRetryMiddleware<
  Args extends any[],
  R extends Promise<any>,
  This = unknown,
>(opts: {
  times?: number;
  delay?: number;
  onCheck: (error: Error, ctx: { cur: number; max: number }) => boolean;
}): Middleware<Args, R, This> {
  return (_, next) => {
    const times = opts.times ?? 30;
    const delay = opts.delay ?? 1_000;
    let count = 0;
    return new Promise(async (resolve, reject) => {
      while (true) {
        try {
          resolve(await next());
          break;
        } catch (error: any) {
          count++;
          if (opts.onCheck(error, { cur: count, max: times })) {
            if (count <= times) {
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
          }
          reject(error);
          break;
        }
      }
    }) as R;
  };
}
