import net from "node:net";
import type { IpcServerPlugin } from "./index";
import { useBeforeMiddleware, withMiddleware } from "@utils/middleware";

export async function disconnect(socket: net.Socket): Promise<void> {
  socket.removeAllListeners();
  await new Promise<void>((resolve, reject) => {
    try {
      socket.end(resolve);
    } catch (e) {
      reject(e);
    }
  });
  socket.destroy();
}

export function enhanceDisconnect(this: IpcServerPlugin) {
  this.disconnect = withMiddleware(
    wrapDisconnectEffect.call(this, this.disconnect),
    async ([id], next) => {
      const socket = this.sockets.get(id);
      if (!socket) return this;
      if (socket.closed) {
        this.sockets.delete(id);
        return this;
      }
      return await next();
    },
  );
}

export function wrapDisconnectEffect<T extends (...args: any[]) => any>(
  this: IpcServerPlugin,
  fn: T,
): T {
  return withMiddleware(
    fn,
    // queue effect
    useBeforeMiddleware(([id]) => void this.queueHub.clear(`write:${id}`)),

    // basic effect
    async ([id], next) => {
      /**
       * - `this` if fn is `disconnect`,
       * - `false` if fn is `handleClosed`,
       */
      const result = await next();
      const passive = !result;
      this.emit("disconnect", { id, passive });
      return this;
    },
  ) as T;
}
