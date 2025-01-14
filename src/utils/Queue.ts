export class Queue {
  private stopFlag: boolean;
  private taskList: (() => Promise<void>)[];
  private runningPromise: Promise<void> | null;
  private timeoutStart: NodeJS.Timeout | null;
  constructor() {
    this.stopFlag = false;
    this.taskList = [];
    this.runningPromise = null;
    this.timeoutStart = null;
  }

  push(task: () => Promise<void>) {
    this.taskList.push(task);
    this.timeoutStart = setTimeout(() => {
      this.timeoutStart && clearTimeout(this.timeoutStart);
      this.start();
    }, 10);
  }

  start() {
    this.stopFlag = false;
    if (this.runningPromise) return;
    this.runningPromise = Promise.resolve().then(async () => {
      while (true) {
        if (this.stopFlag) break;
        const task = this.taskList.shift();
        if (!task) break;
        await task();
      }
      this.runningPromise = null;
    });
  }

  stop() {
    this.stopFlag = true;
    this.timeoutStart && clearTimeout(this.timeoutStart);
  }

  clear() {
    this.taskList = this.taskList.slice(0, 0);
    this.stop();
  }
}

export class QueueHub {
  queues: Map<string, Queue>;
  constructor() {
    this.queues = new Map();
  }

  wrapQueue<This, Args extends any[], R extends any>(
    fn: (this: This, ...args: Args) => Promise<R>,
    resolveId?: (this: This, ...args: Args) => string,
  ): (this: This, ...args: Args) => Promise<R> {
    const hub = this;

    return function (this: This, ...args: Args): Promise<R> {
      const resolver = resolveId ?? (() => "default");
      const id: string = resolver.apply(this, args);
      if (!hub.queues.has(id)) hub.queues.set(id, new Queue());
      const queue = hub.queues.get(id)!;

      let resolve1: (value: R | PromiseLike<R>) => void;
      let reject1: (reason?: any) => void;
      const promise = new Promise<R>((resolve, reject) => {
        resolve1 = resolve;
        reject1 = reject;
      });
      queue.push(() => fn.apply(this, args).then(resolve1, reject1));
      return promise;
    };
  }

  start(id?: string) {
    if (!id) {
      return Array.from(this.queues.values()).forEach((queue) => queue.start());
    }

    const queue = this.queues.get(id);
    if (!queue) return;
    queue.start();
  }

  stop(id?: string) {
    if (!id) {
      return Array.from(this.queues.values()).forEach((queue) => queue.stop());
    }

    const queue = this.queues.get(id);
    if (!queue) return;
    queue.stop();
  }

  clear(id?: string) {
    if (!id) {
      const queues = Array.from(this.queues.values());
      this.queues.clear();
      queues.forEach((queue) => queue.clear());
      return;
    }

    const queue = this.queues.get(id);
    if (!queue) return;
    queue.clear();
    this.queues.delete(id);
  }
}
