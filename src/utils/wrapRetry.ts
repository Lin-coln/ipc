export default function wrapRetry<
  Args extends any[],
  R extends Awaited<any>,
  This,
>(opts: {
  times?: number;
  delay?: number;
  onExecute: (this: This, ...args: Args) => Promise<R>;
  onCheck: (error: Error) => boolean | Promise<boolean>;
  beforeRetry?: (ctx: {
    error: Error;
    times: number;
    count: number;
  }) => unknown;
}): (this: This, ...args: Args) => Promise<R> {
  return async function (this: This, ...args: Args) {
    const times = opts.times ?? 30;
    const delay = opts.delay ?? 1_000;
    let count = 0;
    while (true) {
      try {
        return await opts.onExecute.apply(this, args);
      } catch (error: any) {
        if (await opts.onCheck(error)) {
          if (++count <= times) {
            if (opts.beforeRetry) {
              await opts.beforeRetry({ error, count, times });
            }
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }
        throw error;
      }
    }
  };
}
