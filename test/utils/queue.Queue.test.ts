import { describe, test, expect, vi } from "vitest";
import { Queue, QueueHub } from "../../src/utils/Queue";

const delayFn = (fn) => () => sleep(50).then(() => fn());

describe("Queue basic functionality", () => {
  test.concurrent("should execute tasks in order", async () => {
    const queue = new Queue();
    const taskOrder: string[] = [];
    const pushField = (field) =>
      queue.push(delayFn(() => taskOrder.push(field)));
    pushField("task1");
    pushField("task2");
    pushField("task3");
    queue.start();

    await sleep(50 * 3 + 50);
    expect(taskOrder).toEqual(["task1", "task2", "task3"]);
  });

  test.concurrent("should stop executing tasks when stopped", async () => {
    const queue = new Queue();
    const taskOrder: string[] = [];
    const pushField = (field) =>
      queue.push(delayFn(() => taskOrder.push(field)));
    pushField("task1");
    pushField("task2");
    pushField("task3");
    queue.start();

    await sleep(50 * 2 + 50);
    queue.stop();
    expect(taskOrder).toEqual(["task1", "task2"]);
  });

  test.concurrent("should clear tasks when clear is called", async () => {
    const queue = new Queue();
    const taskOrder: string[] = [];

    const pushField = (field) =>
      queue.push(delayFn(() => taskOrder.push(field)));
    pushField("task1");
    pushField("task2");
    queue.start();
    // 等待任务1开始执行
    await sleep(10); // 确保 task1 已经开始执行

    queue.clear(); // 清除任务队列

    // 立即推入一个新的任务，task3 应该执行
    pushField("task3");

    // 等待所有任务执行完成
    await sleep(50 + 50);
    expect(taskOrder).toEqual(["task1", "task3"]); // task2 应该被清除，task3 会被添加并执行
  });
});

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
