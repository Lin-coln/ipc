export const createPromise = <T = any>() => {
  const promise = new Promise<T>((resolve, reject) => {
    void Object.defineProperties(promise, {
      resolve: {
        get() {
          return resolve;
        },
      },
      reject: {
        get() {
          return reject;
        },
      },
    });
  });
  return promise as Promise<T> & {
    readonly resolve: (value: T | PromiseLike<T>) => void;
    readonly reject: (reason: any) => void;
  };
};
