import { describe, test, expect, vi } from "vitest";
import wrapRetry from "../../src/utils/wrapRetry";

describe("wrapRetry basic functionality", () => {
  test.concurrent("should retry on error", async () => {
    const mockOnExecute = vi
      .fn()
      .mockRejectedValueOnce(new Error("Test Error")) // First call rejects
      .mockResolvedValueOnce("success"); // Second call resolves successfully
    const mockOnCheck = vi.fn().mockResolvedValue(true);
    const mockBeforeRetry = vi.fn();

    const wrappedFn = wrapRetry({
      onExecute: mockOnExecute,
      onCheck: mockOnCheck,
      beforeRetry: mockBeforeRetry,
      delay: 10,
    });

    await expect(wrappedFn()).resolves.toBe("success"); // Expect the final result to be 'success'
    expect(mockOnExecute).toHaveBeenCalledTimes(2); // First call fails, second call succeeds
    expect(mockOnCheck).toHaveBeenCalledTimes(1); // Only called once before retrying
    expect(mockBeforeRetry).toHaveBeenCalledTimes(1); // Called once before retrying
  });

  test.concurrent("should throw error if retries exceed", async () => {
    const mockBeforeRetry = vi.fn();
    const mockOnCheck = vi.fn().mockReturnValue(true);
    const mockOnExecute = vi.fn().mockRejectedValue(new Error("Test Error"));

    const wrappedFn = wrapRetry({
      onExecute: mockOnExecute,
      onCheck: mockOnCheck,
      beforeRetry: mockBeforeRetry,
      times: 3, // retry 3 times
      delay: 10,
    });

    await expect(wrappedFn()).rejects.toThrow("Test Error");

    // 验证 onExecute 是否被调用了 4 次（包括初次执行和 3 次重试）
    expect(mockOnExecute).toHaveBeenCalledTimes(4); // 初次调用 + 3 次重试
    expect(mockOnCheck).toHaveBeenCalledTimes(4); // 每次执行之前都会检查
  });

  test.concurrent(
    "should handle no retries if onCheck returns false",
    async () => {
      // 独立的 mock 函数
      const mockBeforeRetry = vi.fn();
      const mockOnExecute = vi.fn().mockRejectedValue(new Error("Test Error"));
      const mockOnCheck = vi.fn().mockReturnValue(false); // Don't retry

      // 初始化 wrappedFn
      const wrappedFn = wrapRetry({
        onExecute: mockOnExecute,
        onCheck: mockOnCheck,
        beforeRetry: mockBeforeRetry,
        times: 3,
        delay: 10,
      });

      await expect(wrappedFn()).rejects.toThrow("Test Error");

      // 验证 onExecute 是否只被调用了 1 次（没有重试）
      expect(mockOnExecute).toHaveBeenCalledTimes(1);
      expect(mockOnCheck).toHaveBeenCalledTimes(1); // 只调用了一次检查
    },
  );

  test.concurrent("should allow custom beforeRetry logic", async () => {
    const mockBeforeRetry = vi.fn();
    const mockOnCheck = vi.fn().mockResolvedValue(true); // Always retry on error
    const mockOnExecute = vi
      .fn()
      .mockRejectedValueOnce(new Error("Test Error"))
      .mockResolvedValueOnce("success");

    // 初始化 wrappedFn
    const wrappedFn = wrapRetry({
      onExecute: mockOnExecute,
      onCheck: mockOnCheck,
      beforeRetry: mockBeforeRetry,
      times: 1,
      delay: 10,
    });

    // 调用 wrappedFn 并等待重试
    const result = wrappedFn();
    await sleep(20);
    expect(mockBeforeRetry).toHaveBeenCalledWith({
      error: expect.any(Error),
      count: 1,
      times: 1,
    });
    await expect(result).resolves.toBe("success");
  });

  test.concurrent(
    "should use default 'times' value when not provided",
    async () => {
      const mockOnExecute = vi.fn().mockRejectedValue(new Error("Test Error"));
      const mockOnCheck = vi.fn().mockResolvedValue(true); // Always retry on error
      const mockBeforeRetry = vi.fn();
      const wrappedFn = wrapRetry({
        onExecute: mockOnExecute,
        onCheck: mockOnCheck,
        beforeRetry: mockBeforeRetry,
        delay: 10,
      });
      await expect(wrappedFn()).rejects.toThrow("Test Error");
      expect(mockOnExecute).toHaveBeenCalledTimes(31); // 初次执行 + 30 次重试
    },
  );

  test.concurrent(
    "should use default 'delay' value when not provided",
    async () => {
      const mockOnExecute = vi.fn();
      const mockOnCheck = vi.fn().mockResolvedValue(true); // Always retry on error
      const mockBeforeRetry = vi.fn();
      const wrappedFn = wrapRetry({
        onExecute: mockOnExecute,
        onCheck: mockOnCheck,
        beforeRetry: mockBeforeRetry,
        times: 1,
      });
      mockOnExecute.mockRejectedValue(new Error("Test Error"));
      await expect(wrappedFn()).rejects.toThrow("Test Error");
      expect(mockOnExecute).toHaveBeenCalledTimes(2); // 初次执行 + 1 次重试
    },
  );
});

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
