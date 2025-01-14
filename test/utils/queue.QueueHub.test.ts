import { describe, test, expect, vi } from "vitest";
import { Queue, QueueHub } from "../../src/utils/Queue";

const delayFn = (fn) => () => sleep(50).then(() => fn());

describe("QueueHub functionality", () => {
  test.concurrent("should queue tasks by ID", async () => {
    const hub = new QueueHub();
    const taskOrder: string[] = [];

    // mockFn 用于模拟实际任务处理
    const mockFn = vi.fn(async (field) => {
      await delayFn(() => taskOrder.push(field))();
    });

    // 自定义 resolveId，基于传入的任务名称选择队列
    const resolveId = (field: string) =>
      field.startsWith("queue") ? "queue" : "task";

    // 使用 wrapQueue 来包装 mockFn，传入 resolveId 以选择队列
    const wrappedFn = hub.wrapQueue(mockFn, resolveId);

    // 向不同队列添加任务
    wrappedFn("task1");
    wrappedFn("task2");
    wrappedFn("queue3");
    wrappedFn("task4");
    hub.start();

    // 等待所有任务完成
    await sleep(50 * 4 + 50);

    // 验证任务是否按顺序执行
    expect(taskOrder).toEqual(["task1", "queue3", "task2", "task4"]);
  });

  test.concurrent("should queue tasks using default resolveId", async () => {
    const hub = new QueueHub();
    const taskOrder: string[] = [];

    const mockFn = vi.fn(async (field) => {
      await delayFn(() => taskOrder.push(field))();
    });

    // 不传入 resolveId 参数，使用默认的 resolveId
    const wrappedFn = hub.wrapQueue(mockFn);

    // 向不同队列添加任务
    wrappedFn("task1");
    wrappedFn("task2");
    wrappedFn("task3");
    wrappedFn("task4");
    hub.start();

    // 等待任务完成
    await sleep(50 * 4 + 50);

    // 验证任务是否按默认的 resolveId 顺序执行
    expect(taskOrder).toEqual(["task1", "task2", "task3", "task4"]);
  });

  test.concurrent("should handle multiple queues independently", async () => {
    const hub = new QueueHub();
    const taskOrder: string[] = [];

    const mockFn = vi.fn(async (field) => {
      await delayFn(() => taskOrder.push(field))();
    });

    // 自定义 resolveId，基于传入的任务名称选择队列
    const resolveId = (field: string) =>
      field.startsWith("queue") ? "queue" : "task";

    // 使用 wrapQueue 来包装 mockFn，传入 resolveId 以选择队列
    const wrappedFn = hub.wrapQueue(mockFn, resolveId);

    // 向不同队列添加任务
    wrappedFn("task1");
    wrappedFn("task2");
    wrappedFn("queue3");
    wrappedFn("task4");
    hub.start();

    // 等待一些时间确保 queue1 和 queue2 中的任务已完成
    await sleep(50 * 2 + 50);

    // 验证 taskOrder 是否按队列顺序执行
    expect(taskOrder).toEqual(["task1", "queue3", "task2"]);

    // 停止 queue，并验证其他队列的任务是否继续执行
    hub.stop("queue");
    wrappedFn("queue5"); // 尝试给已停止的队列添加任务
    wrappedFn("queue6");
    hub.start("queue");
    await sleep(50);
    hub.stop("queue"); // 尝试停止的队列添加任务

    wrappedFn("task7"); // 给默认队列添加新任务

    // 等待足够时间让任务完成
    await sleep(50 + 10);

    // 验证任务是否继续按正确顺序执行
    expect(taskOrder).toEqual([
      "task1",
      "queue3",
      "task2",
      "task4",
      "queue5",
      "task7",
    ]);

    expect(mockFn).toHaveBeenCalledTimes(6);
  });

  test.concurrent("should start, stop, and clear queues", async () => {
    const hub = new QueueHub();
    const taskOrder: string[] = [];

    // 模拟任务处理
    const mockFn = vi.fn(async (field) => {
      await delayFn(() => taskOrder.push(field))();
    });

    // 自定义 resolveId，基于任务名称选择队列
    const resolveId = (field: string) =>
      field.startsWith("queue") ? "queue" : "task";

    // 使用 wrapQueue 包装 mockFn，传入 resolveId 以选择队列
    const wrappedFn = hub.wrapQueue(mockFn, resolveId);

    // 向不同队列添加任务
    wrappedFn("task1");
    wrappedFn("task2");
    wrappedFn("queue3");
    wrappedFn("task4");
    hub.start();

    // 等待任务执行
    await sleep(50 * 2 + 10); // 等待一些时间，确保队列中的任务执行完

    // 验证任务执行顺序
    expect(taskOrder).toEqual(["task1", "queue3", "task2"]);

    // 停止 queue 队列
    hub.stop("queue");
    wrappedFn("queue5"); // 添加新任务到已经停止的队列
    expect(mockFn).toHaveBeenCalledTimes(4);
    hub.start("queue");
    wrappedFn("task6");
    await sleep(50 * 2 + 10); // 4, 6

    // 验证任务顺序
    expect(taskOrder).toEqual([
      "task1",
      "queue3",
      "task2",
      "task4",
      "queue5",
      "task6",
    ]);
    expect(mockFn).toHaveBeenCalledTimes(6);
  });

  test.concurrent(
    "should start specific queue when id is provided",
    async () => {
      const hub = new QueueHub();
      const taskOrder: string[] = [];
      const mockFn = vi.fn(async (field) => {
        await delayFn(() => taskOrder.push(field))();
      });
      const resolveId = (field: string) =>
        field.startsWith("queue") ? "queue" : "task";
      const wrappedFn = hub.wrapQueue(mockFn, resolveId);

      // 向不同队列添加任务
      wrappedFn("task1");
      wrappedFn("task2");
      wrappedFn("queue3");
      wrappedFn("task4");

      hub.start("queue");

      // 等待任务执行
      await sleep(50 * 4 + 10); // 等待一些时间，确保队列中的任务执行完

      // 验证 taskOrder 是否按顺序执行，确保只有指定队列的任务被执行
      expect(taskOrder).toEqual(["queue3"]);
    },
  );

  test.concurrent(
    "should start all queues when no id is provided",
    async () => {
      const hub = new QueueHub();
      const taskOrder: string[] = [];
      const mockFn = vi.fn(async (field) => {
        await delayFn(() => taskOrder.push(field))();
      });
      const resolveId = (field: string) =>
        field.startsWith("queue") ? "queue" : "task";
      const wrappedFn = hub.wrapQueue(mockFn, resolveId);

      wrappedFn("task1");
      wrappedFn("task2");
      wrappedFn("queue3");
      wrappedFn("task4");

      // 启动所有队列
      hub.start();

      // 等待任务执行
      await sleep(50 * 3 + 10); // 等待一些时间，确保队列中的任务执行完

      // 验证任务顺序，确保所有队列中的任务都按顺序执行
      expect(taskOrder).toEqual(["task1", "queue3", "task2", "task4"]);
    },
  );

  test.concurrent(
    "should clear tasks in all queues when no id is provided",
    async () => {
      const hub = new QueueHub();
      const taskOrder: string[] = [];
      const mockFn = vi.fn(async (field) => {
        await delayFn(() => taskOrder.push(field))();
      });
      const resolveId = (field: string) =>
        field.startsWith("queue") ? "queue" : "task";
      const wrappedFn = hub.wrapQueue(mockFn, resolveId);

      wrappedFn("task1");
      wrappedFn("task2");
      wrappedFn("queue3");
      wrappedFn("task4");
      hub.clear();

      wrappedFn("queue5");
      wrappedFn("task6");
      hub.start();

      // 等待任务执行
      await sleep(50 * 2 + 10); // 等待任务完成

      // 验证所有队列的任务被清除后，只执行了新添加的任务
      expect(taskOrder).toEqual(["queue5", "task6"]);
    },
  );

  test.concurrent(
    "should clear tasks in a specific queue when id is provided",
    async () => {
      const hub = new QueueHub();
      const taskOrder: string[] = [];
      const mockFn = vi.fn(async (field) => {
        await delayFn(() => taskOrder.push(field))();
      });
      const resolveId = (field: string) =>
        field.startsWith("queue") ? "queue" : "task";
      const wrappedFn = hub.wrapQueue(mockFn, resolveId);

      wrappedFn("task1");
      wrappedFn("task2");
      wrappedFn("queue3");
      wrappedFn("task4");
      hub.clear("queue");

      wrappedFn("queue5");
      wrappedFn("task6");
      hub.start();

      // 等待任务执行
      await sleep(50 * 4 + 10); // 等待任务完成

      // 验证清除后的任务顺序，确保 queue 队列的任务没有被执行
      expect(taskOrder).toEqual(["task1", "queue5", "task2", "task4", "task6"]);
    },
  );
});

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
