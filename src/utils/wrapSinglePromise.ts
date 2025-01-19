import { uuid } from "@utils/uuid";

export class PromiseHub {
  promises: Map<string, Promise<any>>;
  constructor() {
    this.promises = new Map();
  }

  delete(id: string) {
    return this.promises.delete(id);
  }

  has(id: string) {
    return this.promises.has(id);
  }

  get<T>(id: string): Promise<T> {
    return this.promises.get(id) as Promise<T>;
  }

  set(id: string, promise: Promise<unknown>) {
    return this.promises.set(id, promise);
  }

  wrapLock<This, Args extends any[], R extends any>(
    fn: (this: This, ...args: Args) => Promise<R>,
    onResolveId?: ((this: This, ...args: Args) => string) | string,
  ): (this: This, ...args: Args) => Promise<R> {
    const id = uuid();
    const resolver = !onResolveId
      ? () => id
      : typeof onResolveId === "string"
        ? () => onResolveId
        : onResolveId;

    const hub = this;
    return function (this: This, ...args: Args) {
      const id: string = resolver.apply(this, args);
      if (hub.has(id)) return hub.get(id)!;
      const promise = new Promise<R>((resolve, reject) => {
        fn.apply(this, args).then(resolve, reject);
      }).finally(() => {
        hub.delete(id);
      });
      hub.set(id, promise);
      return hub.get(id)!;
    };
  }
}
