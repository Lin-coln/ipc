import { describe, it, expect, vi } from "vitest";
import wrapRetry from "../../src/utils/wrapRetry";

describe("wrapRetry basic functionality", () => {
  it("should retry on error", async () => {
    // 独立的 mock 函数
    const mockOnExecute = vi.fn();
    const mockOnCheck = vi.fn().mockResolvedValue(true); // Always retry on error
    const mockBeforeRetry = vi.fn();

    // 初始化 wrappedFn
    const wrappedFn = wrapRetry({
      onExecute: mockOnExecute,
      onCheck: mockOnCheck,
      beforeRetry: mockBeforeRetry,
      times: 3,
      delay: 500,
    });

    mockOnExecute
      .mockRejectedValueOnce(new Error("Test Error")) // First call rejects
      .mockResolvedValueOnce("success"); // Second call resolves successfully

    const result = wrappedFn();
    await expect(result).resolves.toBe("success"); // Expect the final result to be 'success'
    expect(mockOnExecute).toHaveBeenCalledTimes(2); // First call fails, second call succeeds
    expect(mockOnCheck).toHaveBeenCalledTimes(1); // Only called once before retrying
    expect(mockBeforeRetry).toHaveBeenCalledTimes(1); // Called once before retrying
  });

  it("should throw error if retries exceed", async () => {
    // 独立的 mock 函数
    const mockOnExecute = vi.fn();
    const mockOnCheck = vi.fn().mockResolvedValue(true); // Always retry on error
    const mockBeforeRetry = vi.fn();

    // 初始化 wrappedFn
    const wrappedFn = wrapRetry({
      onExecute: mockOnExecute,
      onCheck: mockOnCheck,
      beforeRetry: mockBeforeRetry,
      times: 3, // 最大重试次数
      delay: 500,
    });

    // 模拟每次都失败
    mockOnExecute.mockRejectedValue(new Error("Test Error"));

    // mockOnCheck: 在最大重试次数后返回 false，表示停止重试
    mockOnCheck
      .mockResolvedValueOnce(true) // 初次执行，继续重试
      .mockResolvedValueOnce(true) // 第一次重试，继续重试
      .mockResolvedValueOnce(true) // 第二次重试，继续重试
      .mockResolvedValueOnce(false); // 第三次重试，返回 false，停止重试

    // 调用 wrappedFn 并检查是否抛出错误
    await expect(wrappedFn()).rejects.toThrow("Test Error");

    // 验证 onExecute 是否被调用了 4 次（包括初次执行和 3 次重试）
    expect(mockOnExecute).toHaveBeenCalledTimes(4); // 初次调用 + 3 次重试
    expect(mockOnCheck).toHaveBeenCalledTimes(4); // 每次执行之前都会检查
  });

  it("should handle no retries if onCheck returns false", async () => {
    // 独立的 mock 函数
    const mockOnExecute = vi.fn();
    const mockOnCheck = vi.fn().mockResolvedValueOnce(false); // Don't retry
    const mockBeforeRetry = vi.fn();

    // 初始化 wrappedFn
    const wrappedFn = wrapRetry({
      onExecute: mockOnExecute,
      onCheck: mockOnCheck,
      beforeRetry: mockBeforeRetry,
      times: 3,
      delay: 500,
    });

    mockOnExecute.mockRejectedValueOnce(new Error("Test Error"));

    // 调用 wrappedFn 并检查是否抛出错误
    await expect(wrappedFn()).rejects.toThrow("Test Error");

    // 验证 onExecute 是否只被调用了 1 次（没有重试）
    expect(mockOnExecute).toHaveBeenCalledTimes(1);
    expect(mockOnCheck).toHaveBeenCalledTimes(1); // 只调用了一次检查
  });

  it("should allow custom beforeRetry logic", async () => {
    // 独立的 mock 函数
    const mockOnExecute = vi.fn();
    const mockOnCheck = vi.fn().mockResolvedValue(true); // Always retry on error
    const mockBeforeRetry = vi.fn();

    // 初始化 wrappedFn
    const wrappedFn = wrapRetry({
      onExecute: mockOnExecute,
      onCheck: mockOnCheck,
      beforeRetry: mockBeforeRetry,
      times: 2,
      delay: 500,
    });

    mockOnExecute
      .mockRejectedValueOnce(new Error("Test Error"))
      .mockResolvedValueOnce("success");

    // 调用 wrappedFn 并等待重试
    const result = wrappedFn();
    await sleep(1000); // 等待重试逻辑执行
    expect(mockBeforeRetry).toHaveBeenCalledWith({
      error: expect.any(Error),
      count: 1,
      times: 2,
    });
    await expect(result).resolves.toBe("success");
  });

  it("should use default 'times' value when not provided", async () => {
    const mockOnExecute = vi.fn();
    const mockOnCheck = vi.fn().mockResolvedValue(true); // Always retry on error
    const mockBeforeRetry = vi.fn();

    const wrappedFn = wrapRetry({
      onExecute: mockOnExecute,
      onCheck: mockOnCheck,
      beforeRetry: mockBeforeRetry,
      delay: 10,
    });

    mockOnExecute.mockRejectedValue(new Error("Test Error"));

    await expect(wrappedFn()).rejects.toThrow("Test Error");

    expect(mockOnExecute).toHaveBeenCalledTimes(31); // 初次执行 + 30 次重试
  });

  it("should use default 'delay' value when not provided", async () => {
    const mockOnExecute = vi.fn();
    const mockOnCheck = vi.fn().mockResolvedValue(true); // Always retry on error
    const mockBeforeRetry = vi.fn();

    const wrappedFn = wrapRetry({
      onExecute: mockOnExecute,
      onCheck: mockOnCheck,
      beforeRetry: mockBeforeRetry,
      times: 2,
    });
    mockOnExecute.mockRejectedValue(new Error("Test Error"));
    await expect(wrappedFn()).rejects.toThrow("Test Error");
    expect(mockOnExecute).toHaveBeenCalledTimes(3); // 初次执行 + 2 次重试
  });
});

// Utility function to simulate async delay
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
