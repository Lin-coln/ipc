import type { IpcServerPlugin } from "./index";
import { withMiddleware } from "@utils/middleware";

export function enhanceClose(this: IpcServerPlugin) {
  this.close = withMiddleware(
    wrapCloseEffect.call(this, this.close),
    // async (_, next) => {
    //   if (!this.server.listening) return this;
    //   return await next();
    // },
  );
}

export function wrapCloseEffect<T extends (...args: any[]) => any>(
  this: IpcServerPlugin,
  fn: T,
): T {
  return withMiddleware(
    fn,
    // emit
    async (_, next) => {
      const result = await next();
      this.emit("close");
      return result;
    },
  ) as T;
}
