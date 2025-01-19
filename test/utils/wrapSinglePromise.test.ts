import { describe, it, expect, vi } from "vitest";
import { PromiseHub } from "../../src/utils/wrapSinglePromise";

describe("general usage", async () => {
  const hub = new PromiseHub();
  const args = ["foo", "bar"];
  const result = "foobar";
  const mockHandler = vi.fn();
  let resolve1: (value: string) => void;
  const wrappedFn = hub.wrapSinglePromise((...args) => {
    const { promise, resolve } = Promise.withResolvers();
    resolve1 = resolve;
    return promise.then((result) => {
      mockHandler({ args, result });
      return result;
    });
  });

  const promise1 = wrappedFn(...args);
  const promise2 = wrappedFn(...args);

  it("should be same promise", () => expect(promise1).toBe(promise2));

  await sleep();
  resolve1!(result);
  await promise1;

  it("should receive correct args & result", () => {
    expect(mockHandler).toHaveBeenCalledWith({ args, result });
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });
});

describe("arg - onResolveId as function", async () => {
  const hub = new PromiseHub();

  const resolveId = (a, b) => a + b;
  const wrappedFn = hub.wrapSinglePromise(
    async (a: string, b: string) => a + b,
    resolveId,
  );

  const promise1 = wrappedFn("foo", "bar");
  const promise2 = wrappedFn("foo", "bar");
  const promise3 = wrappedFn("zoo", "bar");

  it("should be same promise if same Id", () =>
    expect(promise1).toBe(promise2));
  it("should be diff promise if diff Id", () =>
    expect(promise1).not.toBe(promise3));
});

describe("error case", () => {
  const hub = new PromiseHub();

  const errorMessage = "Test Error";
  it("should reject reason if external error", async () => {
    let reject1: (reason?: any) => void;
    const wrappedFn = hub.wrapSinglePromise(() => {
      const { promise, reject } = Promise.withResolvers();
      reject1 = reject;
      return promise;
    });
    await expect(async () => {
      const promise = wrappedFn();
      await sleep();
      reject1(errorMessage);
      await promise;
    }).rejects.toBe(errorMessage);
  });
  it("should throw error if internal error", async () => {
    const wrappedFn = hub.wrapSinglePromise(123 as any);
    await expect(() => wrappedFn()).rejects.toThrow(
      "fn.apply is not a function",
    );
  });
});

async function sleep(time?: number) {
  await new Promise((resolve) => setTimeout(resolve, time ?? undefined));
}
