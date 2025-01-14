import { describe, it, expect, vi } from "vitest";
import wrapSinglePromise from "../../src/utils/wrapSinglePromise";

describe("without resolveId", async () => {
  const args = ["foo", "bar"];
  const result = "foobar";
  const mockHandler = vi.fn();
  let resolve1: (value: string) => void;
  const wrappedFn = wrapSinglePromise((...args) => {
    const { promise, resolve } = Promise.withResolvers();
    resolve1 = resolve;
    return promise.then((result) => {
      mockHandler({ args, result });
      return result;
    });
  });

  it("1. should be same promise", () => {
    expect(wrappedFn(...args)).toBe(wrappedFn(...args));
  });

  it("2. should receive correct args & result", async () => {
    await sleep();
    resolve1!(result);
    await sleep();
    expect(mockHandler).toHaveBeenCalledWith({ args, result });
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });
});

describe("specific resolveId", async () => {
  const resolveId = (a, b) => a + b;
  const wrappedFn = wrapSinglePromise(
    async (a: string, b: string) => a + b,
    resolveId,
  );

  const promise1 = wrappedFn("foo", "bar");
  const promise2 = wrappedFn("foo", "bar");
  const promise3 = wrappedFn("zoo", "bar");

  it("1. should be same promise if same Id", () =>
    expect(promise1).toBe(promise2));
  it("2. should be diff promise if diff Id", () =>
    expect(promise1).not.toBe(promise3));
});

describe("error case", () => {
  const errorMessage = "foobar error";
  it("1. should reject", async () => {
    let reject1: (reason?: any) => void;
    const wrappedFn = wrapSinglePromise(() => {
      const { promise, reject } = Promise.withResolvers();
      reject1 = reject;
      return promise;
    });
    expect(async () => {
      const promise = wrappedFn();
      await sleep();
      reject1(errorMessage);
      await promise;
    }).rejects.toBe(errorMessage);
  });
  it("2. should throw error", async () => {
    const wrappedFn = wrapSinglePromise(123 as any);
    expect(() => {
      return wrappedFn();
    }).rejects.toThrow("fn.apply is not a function");
  });
});

async function sleep(time?: number) {
  await new Promise((resolve) => setTimeout(resolve, time ?? undefined));
}
