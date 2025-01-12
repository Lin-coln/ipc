export type Loop = {
  start: () => void;
  push: (task: () => Promise<void>) => void;
  stop: () => void;
  clear: () => void;

  wrap<This, Args extends any[], R extends any>(
    fn: (this: This, ...args: Args) => Promise<R>,
  ): (this: This, ...args: Args) => Promise<R>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createLoop(): Loop {
  let stopFlag = false;
  let taskList: (() => Promise<void>)[] = [];
  let runningPromise: Promise<void> | null = null;

  return {
    start() {
      if (runningPromise) return;
      stopFlag = false;
      runningPromise = Promise.resolve().then(async () => {
        while (true) {
          if (stopFlag) break;
          const task = taskList.shift();
          if (!task) break;
          await task();
        }
        runningPromise = null;
      });
    },
    push(task: () => Promise<void>) {
      taskList.push(task);
      this.start();
    },
    stop() {
      stopFlag = true;
    },
    clear() {
      taskList = taskList.slice(0, 0);
      this.stop();
    },
    wrap<This, Args extends any[], R extends any>(
      fn: (this: This, ...args: Args) => Promise<R>,
    ): (this: This, ...args: Args) => Promise<R> {
      const loop = this;
      return function (this: This, ...args: Args) {
        let resolve1;
        let reject1;
        const promise = new Promise<R>((resolve, reject) => {
          resolve1 = resolve;
          reject1 = reject;
        });
        loop.push(() => fn.apply(this, args).then(resolve1, reject1));
        return promise;
      };
    },
  };
}
