import { describe, test, expect, vi } from "vitest";
import { Queue, QueueHub } from "../../src/utils/Queue";

describe("Queue basic functionality", () => {
  test.concurrent("should execute tasks in order", async () => {
    const queue = new Queue();
    const taskOrder: string[] = [];

    const task1 = async () => {
      await sleep(100);
      taskOrder.push("task1");
    };
    const task2 = async () => {
      await sleep(100);
      taskOrder.push("task2");
    };
    const task3 = async () => {
      await sleep(100);
      taskOrder.push("task3");
    };

    queue.push(task1);
    queue.push(task2);
    queue.push(task3);

    // 等待所有任务执行完成
    await sleep(350); // 等待任务完成的总时间
    expect(taskOrder).toEqual(["task1", "task2", "task3"]);
  });

  test.concurrent("should stop executing tasks when stopped", async () => {
    const queue = new Queue();
    const taskOrder: string[] = [];

    const task1 = async () => {
      await sleep(100);
      taskOrder.push("task1");
    };
    const task2 = async () => {
      await sleep(100);
      taskOrder.push("task2");
    };
    const task3 = async () => {
      await sleep(100);
      taskOrder.push("task3");
    };

    queue.push(task1);
    queue.push(task2);
    queue.push(task3);

    await sleep(150);
    queue.stop();
    await sleep(200); // Wait some time after stop to check if further tasks run
    expect(taskOrder).toEqual(["task1", "task2"]);
  });

  test.concurrent("should clear tasks when clear is called", async () => {
    const queue = new Queue();
    const taskOrder: string[] = [];

    const task1 = async () => {
      await sleep(100);
      taskOrder.push("task1");
    };
    const task2 = async () => {
      await sleep(100);
      taskOrder.push("task2");
    };

    // 添加任务到队列
    queue.push(task1);
    queue.push(task2);

    // 等待任务1开始执行
    await sleep(50); // 确保 task1 已经开始执行
    queue.clear(); // 清除任务队列

    // 立即推入一个新的任务，task3 应该执行
    queue.push(task1);

    // 等待所有任务执行完成
    await sleep(250);

    expect(taskOrder).toEqual(["task1", "task1"]); // task2 应该被清除，task3 会被添加并执行
  });
});

describe("QueueHub functionality", () => {
  test.concurrent("should queue tasks by ID", async () => {
    const hub = new QueueHub();
    const taskOrder: string[] = [];

    // mockFn 用于模拟实际任务处理
    const mockFn = vi.fn(async (taskName: string) => {
      await sleep(100);
      taskOrder.push(taskName);
    });

    // 自定义 resolveId，基于传入的任务名称选择队列
    const resolveId = (taskName: string) =>
      taskName.startsWith("queue") ? "queue" : "task";

    // 使用 wrapQueue 来包装 mockFn，传入 resolveId 以选择队列
    const wrappedFn = hub.wrapQueue(mockFn, resolveId);

    // 向不同队列添加任务
    wrappedFn("task1"); // 由 resolveId 分配到默认队列
    wrappedFn("task2"); // 由 resolveId 分配到默认队列
    wrappedFn("queue3"); // 由 resolveId 分配到 queue1
    wrappedFn("task4"); // 由 resolveId 分配到默认队列

    // 等待所有任务完成
    await sleep(350);

    // 验证任务是否按顺序执行
    expect(taskOrder).toEqual(["task1", "queue3", "task2", "task4"]);
  });

  test.concurrent("should queue tasks using default resolveId", async () => {
    const hub = new QueueHub();
    const taskOrder: string[] = [];

    const mockFn = vi.fn(async (taskName: string) => {
      await sleep(100);
      taskOrder.push(taskName);
    });

    // 不传入 resolveId 参数，使用默认的 resolveId
    const wrappedFn = hub.wrapQueue(mockFn);

    // 向不同队列添加任务
    wrappedFn("task1"); // 默认队列
    wrappedFn("task2"); // 默认队列
    wrappedFn("task3"); // 默认队列
    wrappedFn("task4"); // 默认队列

    // 等待任务完成
    await sleep(450);

    // 验证任务是否按默认的 resolveId 顺序执行
    expect(taskOrder).toEqual(["task1", "task2", "task3", "task4"]);
  });

  test.concurrent("should handle multiple queues independently", async () => {
    const hub = new QueueHub();
    const taskOrder: string[] = [];

    // mockFn 用于模拟实际任务处理
    const mockFn = vi.fn(async (taskName: string) => {
      await sleep(100);
      taskOrder.push(taskName);
    });

    // 自定义 resolveId，基于传入的任务名称选择队列
    const resolveId = (taskName: string) =>
      taskName.startsWith("queue") ? "queue" : "task";

    // 使用 wrapQueue 来包装 mockFn，传入 resolveId 以选择队列
    const wrappedFn = hub.wrapQueue(mockFn, resolveId);

    // 向不同队列添加任务
    wrappedFn("task1"); // 由 resolveId 分配到默认队列
    wrappedFn("task2"); // 由 resolveId 分配到默认队列
    wrappedFn("queue3"); // 由 resolveId 分配到 queue1
    wrappedFn("task4"); // 由 resolveId 分配到默认队列

    // 等待一些时间确保 queue1 和 queue2 中的任务已完成
    await sleep(250);

    // 验证 taskOrder 是否按队列顺序执行
    expect(taskOrder).toEqual(["task1", "queue3", "task2"]);

    // 停止 queue1，并验证其他队列的任务是否继续执行
    hub.stop("queue");
    wrappedFn("queue5"); // 尝试给已停止的队列添加任务
    await sleep(150);

    wrappedFn("queue6");
    hub.stop("queue"); // 尝试停止的队列添加任务

    wrappedFn("task7"); // 给默认队列添加新任务

    // 等待足够时间让任务完成
    await sleep(250);

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
    const mockFn = vi.fn(async (taskName: string) => {
      await sleep(100); // 模拟任务异步执行
      taskOrder.push(taskName);
    });

    // 自定义 resolveId，基于任务名称选择队列
    const resolveId = (taskName: string) =>
      taskName.startsWith("queue") ? "queue" : "task";

    // 使用 wrapQueue 包装 mockFn，传入 resolveId 以选择队列
    const wrappedFn = hub.wrapQueue(mockFn, resolveId);

    // 向不同队列添加任务
    wrappedFn("task1"); // 默认队列
    wrappedFn("task2"); // 默认队列
    wrappedFn("queue3"); // queue 队列
    wrappedFn("task4"); // 默认队列

    // 等待任务执行
    await sleep(250); // 等待一些时间，确保队列中的任务执行完

    // 验证任务执行顺序
    expect(taskOrder).toEqual(["task1", "queue3", "task2"]);

    // 停止 queue 队列
    hub.stop("queue");
    wrappedFn("queue5"); // 添加新任务到已经停止的队列
    await sleep(150);

    // 添加其他队列任务和默认队列任务
    wrappedFn("queue6");
    wrappedFn("task7");

    // 等待足够时间让任务完成
    await sleep(250);

    // 验证任务顺序
    expect(taskOrder).toEqual([
      "task1",
      "queue3",
      "task2",
      "task4",
      "queue5",
      "queue6",
      "task7",
    ]);

    expect(mockFn).toHaveBeenCalledTimes(7);
  });

  test.concurrent(
    "should start specific queue when id is provided",
    async () => {
      const hub = new QueueHub();
      const taskOrder: string[] = [];

      // 模拟任务处理
      const mockFn = vi.fn(async (taskName: string) => {
        await sleep(100); // 模拟任务异步执行
        taskOrder.push(taskName);
      });

      // 自定义 resolveId，基于任务名称选择队列
      const resolveId = (taskName: string) =>
        taskName.startsWith("queue") ? "queue" : "task";

      // 使用 wrapQueue 包装 mockFn，传入 resolveId 以选择队列
      const wrappedFn = hub.wrapQueue(mockFn, resolveId);

      // 向不同队列添加任务
      wrappedFn("task1"); // 默认队列
      hub.stop("task");
      wrappedFn("task2"); // 默认队列
      hub.stop("task");
      wrappedFn("queue3"); // queue 队列
      wrappedFn("task4"); // 默认队列
      hub.stop("task");
      hub.stop("queue");
      hub.start("queue");

      // 等待任务执行
      await sleep(250); // 等待一些时间，确保队列中的任务执行完

      // 验证 taskOrder 是否按顺序执行，确保只有指定队列的任务被执行
      expect(taskOrder).toEqual(["queue3"]);
    },
  );

  test.concurrent(
    "should start all queues when no id is provided",
    async () => {
      const hub = new QueueHub();
      const taskOrder: string[] = [];

      // 模拟任务处理
      const mockFn = vi.fn(async (taskName: string) => {
        await sleep(100); // 模拟任务异步执行
        taskOrder.push(taskName);
      });

      // 自定义 resolveId，基于任务名称选择队列
      const resolveId = (taskName: string) =>
        taskName.startsWith("queue") ? "queue" : "task";

      // 使用 wrapQueue 包装 mockFn，传入 resolveId 以选择队列
      const wrappedFn = hub.wrapQueue(mockFn, resolveId);

      // 向不同队列添加任务
      wrappedFn("task1"); // 默认队列
      hub.stop();
      wrappedFn("task2"); // 默认队列
      hub.stop();
      wrappedFn("queue3"); // queue 队列
      hub.stop();
      wrappedFn("task4"); // 默认队列
      hub.stop();

      // 启动所有队列
      hub.start();

      // 等待任务执行
      await sleep(350); // 等待一些时间，确保队列中的任务执行完

      // 验证任务顺序，确保所有队列中的任务都按顺序执行
      expect(taskOrder).toEqual(["task1", "queue3", "task2", "task4"]);
    },
  );

  test.concurrent(
    "should clear tasks in all queues when no id is provided",
    async () => {
      const hub = new QueueHub();
      const taskOrder: string[] = [];

      // 模拟任务处理
      const mockFn = vi.fn(async (taskName: string) => {
        await sleep(100); // 模拟任务异步执行
        taskOrder.push(taskName);
      });

      // 自定义 resolveId，基于任务名称选择队列
      const resolveId = (taskName: string) =>
        taskName.startsWith("queue") ? "queue" : "task";

      // 使用 wrapQueue 包装 mockFn，传入 resolveId 以选择队列
      const wrappedFn = hub.wrapQueue(mockFn, resolveId);

      // 向不同队列添加任务
      wrappedFn("task1"); // 默认队列
      wrappedFn("task2"); // 默认队列
      wrappedFn("queue3"); // queue 队列
      wrappedFn("task4"); // 默认队列

      // 清除所有队列的任务
      hub.clear();

      // 向队列添加新任务
      wrappedFn("queue5"); // 由 resolveId 分配到 queue 队列
      wrappedFn("task6"); // 默认队列

      // 等待任务执行
      await sleep(250); // 等待任务完成

      // 验证所有队列的任务被清除后，只执行了新添加的任务
      expect(taskOrder).toEqual(["queue5", "task6"]);
    },
  );

  test.concurrent(
    "should clear tasks in a specific queue when id is provided",
    async () => {
      const hub = new QueueHub();
      const taskOrder: string[] = [];

      // 模拟任务处理
      const mockFn = vi.fn(async (taskName: string) => {
        await sleep(100); // 模拟任务异步执行
        taskOrder.push(taskName);
      });

      // 自定义 resolveId，基于任务名称选择队列
      const resolveId = (taskName: string) =>
        taskName.startsWith("queue") ? "queue" : "task";

      // 使用 wrapQueue 包装 mockFn，传入 resolveId 以选择队列
      const wrappedFn = hub.wrapQueue(mockFn, resolveId);

      // 向不同队列添加任务
      wrappedFn("task1"); // 默认队列
      wrappedFn("task2"); // 默认队列
      wrappedFn("queue3"); // queue 队列
      wrappedFn("task4"); // 默认队列

      // 清除 queue 队列
      hub.clear("queue");

      // 向队列添加新任务
      wrappedFn("queue5"); // 由 resolveId 分配到 queue 队列
      wrappedFn("task6"); // 默认队列

      // 等待任务执行
      await sleep(450); // 等待任务完成

      // 验证清除后的任务顺序，确保 queue 队列的任务没有被执行
      expect(taskOrder).toEqual(["task1", "queue5", "task2", "task4", "task6"]);
    },
  );
});

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
