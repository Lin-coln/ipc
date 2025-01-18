import { describe, it, expect, vi } from "vitest";
import {
  withMiddleware,
  useArgsMiddleware,
  Middleware,
} from "../../src/utils/middleware";

describe("withMiddleware", () => {
  it("should execute the function without middlewares", async () => {
    const fn = vi.fn(async (x: number) => x * 2);
    const wrappedFn = withMiddleware(fn);

    const result = await wrappedFn(5);
    expect(result).toBe(10);
    expect(fn).toHaveBeenCalledWith(5);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should execute middlewares in the correct order", async () => {
    const fn = vi.fn(async (x: number) => x * 2);

    const mw1: Middleware<[number], number> = vi.fn(async (args, next) => {
      args[0] += 1;
      return next();
    });

    const mw2: Middleware<[number], number> = vi.fn(async (args, next) => {
      args[0] *= 2;
      return next();
    });

    const wrappedFn = withMiddleware(fn, mw1, mw2);

    const result = await wrappedFn(5);
    expect(result).toBe(22); // ((5 * 2) + 1) * 2
    expect(mw2).toHaveBeenCalledWith([10], expect.any(Function));
    expect(mw1).toHaveBeenCalledWith([11], expect.any(Function));
    expect(fn).toHaveBeenCalledWith(11);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should short-circuit if middleware does not call next", async () => {
    const fn = vi.fn(async (x: number) => x * 2);

    const mw1: Middleware<[number], number> = vi.fn(async (args) => {
      args[0] += 1;
      return args[0]; // Does not call next
    });

    const mw2: Middleware<[number], number> = vi.fn(async (args, next) => {
      args[0] *= 2;
      return next();
    });

    const wrappedFn = withMiddleware(fn, mw1, mw2);

    const result = await wrappedFn(5);
    expect(result).toBe(11); // (5 * 2) + 1
    expect(mw2).toHaveBeenCalledWith([10], expect.any(Function));
    expect(mw1).toHaveBeenCalledWith([11], expect.any(Function));
    expect(fn).not.toHaveBeenCalled(); // `fn` is never called
  });
});

describe("useArgsMiddleware", () => {
  it("should modify arguments using the middleware", async () => {
    const fn = vi.fn(async (x: number, y: number) => x + y);

    const modifyArgs = useArgsMiddleware<[number, number], number>((args) => {
      args[0] += 1;
      args[1] *= 2;
      return args;
    });

    const wrappedFn = withMiddleware(fn, modifyArgs);

    const result = await wrappedFn(2, 3);
    expect(result).toBe(9); // (2 + 1) + (3 * 2)
    expect(fn).toHaveBeenCalledWith(3, 6);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should not modify arguments if modify function returns void", async () => {
    const fn = vi.fn(async (x: number, y: number) => x + y);

    const modifyArgs = useArgsMiddleware<[number, number], number>(() => {
      // No modification
    });

    const wrappedFn = withMiddleware(fn, modifyArgs);

    const result = await wrappedFn(2, 3);
    expect(result).toBe(5); // 2 + 3
    expect(fn).toHaveBeenCalledWith(2, 3);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should modify arguments in place", async () => {
    const fn = vi.fn(async (x: number, y: number) => x + y);

    const modifyArgs = useArgsMiddleware<[number, number], number>((args) => {
      args[0] = args[0] * 2;
      args[1] = args[1] + 3;
    });

    const wrappedFn = withMiddleware(fn, modifyArgs);

    const result = await wrappedFn(2, 3);
    expect(result).toBe(10); // (2 * 2) + (3 + 3)
    expect(fn).toHaveBeenCalledWith(4, 6);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
