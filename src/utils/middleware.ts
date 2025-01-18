export type Middleware<Args extends any[], R extends any, This = unknown> = (
  this: This,
  args: Args,
  next: () => Promise<R>,
) => Promise<R>;

export function withMiddleware<
  Args extends any[],
  R extends any,
  This = unknown,
>(
  fn: (this: This, ...args: Args) => Promise<R>,
  ...middlewares: Middleware<Args, R, This>[]
): (this: This, ...args: Args) => Promise<R> {
  if (!middlewares.length) return fn;

  if (middlewares.length === 1) {
    const mw = middlewares[0];
    return function (this: This, ...args: Args): Promise<R> {
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
