import net from "node:net";
import { useBeforeMiddleware, withMiddleware } from "@utils/middleware";
import type { IpcClientPlugin } from "./index";
import { Logger } from "@interfaces/index";

/**
 * 1. removeAllListeners
 * 2. end
 * 3. destroy
 */
export async function disconnect(socket: net.Socket) {
  socket.removeAllListeners();
  await new Promise<void>((resolve, reject) => {
    try {
      socket.end(() => resolve());
    } catch (e) {
      reject(e);
    }
  });
  socket.destroy();
}

export function enhanceDisconnect(this: IpcClientPlugin, logger: Logger) {
  this.disconnect = withMiddleware(
    wrapDisconnectEffect.call(this, this.disconnect),
    async (_, next) => {
      const socket = this.socket;
      if (socket.closed) return this;
      return await next();
    },
  );
}

export function wrapDisconnectEffect<T extends (...args: any[]) => any>(
  this: IpcClientPlugin,
  fn: T,
): T {
  return withMiddleware(
    fn,
    // queue effect
    useBeforeMiddleware(() => void this.queueHub.clear("write")),

    // basic effect
    async (_, next) => {
      const identifier = this.remoteIdentifier!;

      /**
       * - `this` if fn is `disconnect`,
       * - `false` if fn is `handleClosed`,
       */
      const result = await next();

      const passive = !result;
      this.connOpts = null;
      this.emit("disconnect", { identifier, passive });
      return result;
    },
  ) as T;
}
