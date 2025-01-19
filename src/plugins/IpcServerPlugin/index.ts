import net from "node:net";
import fs from "node:fs";
import process from "node:process";
import { Logger, ServerEvents, ServerPlugin } from "@interfaces/index";
import EventBus from "@utils/EventBus";
import useCleanup from "@utils/useCleanup";
import { uuid } from "@utils/uuid";
import fixPipeName from "@utils/fixPipeName";
import { PromiseHub } from "@utils/wrapSinglePromise";
import { QueueHub } from "@utils/Queue";
import { useBeforeMiddleware, withMiddleware } from "@utils/middleware";
import { listen } from "./listen";

// const logger: Logger = console;
const logger: Logger = { log() {} };

export class IpcServerPlugin
  extends EventBus<ServerEvents>
  implements ServerPlugin<net.ListenOptions>
{
  queueHub: QueueHub;
  promiseHub: PromiseHub;
  server: net.Server;
  sockets: Map<string, net.Socket>;
  constructor(opts: net.ServerOpts) {
    super();
    this.queueHub = new QueueHub();
    this.promiseHub = new PromiseHub();
    this.server = new net.Server(opts);
    this.sockets = new Map();

    // add logger to emit
    this.emit = withMiddleware(
      this.emit,
      useBeforeMiddleware(([event, ...rest]) => {
        if (event === "disconnect") {
          logger.log(`[server] emit`, event, ...rest);
        } else {
          logger.log(`[server] emit`, event);
        }
      }),
    );

    enhanceServer.call(this);

    const queueHub = this.queueHub;
    const promiseHub = this.promiseHub;
    this.listen = promiseHub.wrapLock(this.listen, "listen");
    this.close = promiseHub.wrapLock(this.close, "close");
    this.write = queueHub.wrapQueue(this.write, (id) => `write_${id}`);
    this.disconnect = promiseHub.wrapLock(
      this.disconnect,
      (id) => `disconnect_${id}`,
    );
  }

  async listen(opts: net.ListenOptions): Promise<this> {
    const server = this.server;
    if (server.listening) return this;

    logger.log(`[server.server] listen...`);
    await listen(server, opts);
    bindServerLog(server);
    server
      .on("error", (err) => {
        this.emit("error", err);
      })
      .on("close", () => {
        this.server.removeAllListeners();
        this.emit("close");
      })
      .on("connection", handleSocketConnection.bind(this));
    this.emit("listening");
    return this;
  }

  async disconnect(id: string): Promise<this> {
    const socket = this.sockets.get(id);
    if (!socket) {
      // throw new Error(`failed to disconnect - socket not found: ${id}`);
      return this;
    }
    this.sockets.delete(id);

    this.queueHub.clear(`write_${id}`);
    this.queueHub.clear(`read_${id}`);

    if (socket.closed) return this;
    socket.removeAllListeners();
    await new Promise<void>((resolve, reject) => {
      try {
        logger.log(`[server.socket] ending`);
        socket.end(resolve);
      } catch (e) {
        reject(e);
      }
    });
    logger.log(`[server.socket] destroying`);
    socket.destroy();
    this.emit("disconnect", { id, passive: false });
    return this;
  }

  async close(): Promise<this> {
    if (!this.server.listening) return this;
    this.server.removeAllListeners();
    const closePromise = new Promise<void>((resolve, reject) => {
      logger.log(`[server.server] closing`);
      this.server.close((err) => (err ? reject(err) : resolve()));
      logger.log("detect listening", this.server.listening);
    });
    const socketIdList = Array.from(this.sockets.keys());
    await Promise.all(socketIdList.map((id) => this.disconnect(id)));
    await closePromise;
    this.emit("close");
    return this;
  }

  async write(id: string, data: Buffer): Promise<this> {
    const socket = this.sockets.get(id);
    if (!socket) {
      throw new Error(`[server] failed to write - socket not found: ${id}`);
    }
    const done = socket.write(data);
    if (done) return this;

    let handler: ServerEvents["disconnect"];
    await new Promise<void>((resolve, reject) => {
      handler = (ctx) => {
        if (ctx.id !== id) return;
        this.off("disconnect", handler);
        reject(new Error(`[client] failed to write - disconnect`));
      };
      this.on("disconnect", handler);
      socket.once("drain", () => resolve());
    }).finally(() => {
      handler && this.off("disconnect", handler);
    });

    return this;
  }
}

function enhanceServer(this: IpcServerPlugin) {
  const listen = this.listen;
  this.listen = function (this: IpcServerPlugin, opts: net.ListenOptions) {
    let sockPath = opts.path;
    if (!sockPath) return listen.call(this, opts);

    sockPath = fixPipeName(sockPath);

    // wrap clear sock file
    const clearSock = () =>
      process.platform !== "win32" &&
      fs.existsSync(sockPath) &&
      fs.unlinkSync(sockPath);
    return listen
      .call(this, { ...opts, path: sockPath })
      .then((res) => {
        useCleanup(clearSock);
        return res;
      })
      .catch((e) => {
        clearSock();
        throw e;
      });
  };
}

function handleSocketConnection(this: IpcServerPlugin, socket: net.Socket) {
  const id = uuid();
  logger.log(`[server.socket] connection`, id);

  bindSocketLog(socket);
  const handleClose = () => {
    this.sockets.delete(id);
    this.queueHub.clear(`write_${id}`);
    this.queueHub.clear(`read_${id}`);
    socket.removeAllListeners();
    logger.log(`[server.socket] destroying`);
    socket.destroy();
    this.emit("disconnect", { id, passive: true });
  };
  const handleData = async (data: Buffer) => {
    logger.log(`[server.socket] data`, data.toString("utf8"));
    this.emit("data", id, data);
  };
  socket
    .on("error", (err) => {
      this.emit("error", err);
      if (socket.closed) handleClose();
    })
    .on("close", (hadError: boolean) => {
      if (hadError) return;
      handleClose();
    })
    .on(
      "data",
      this.queueHub.wrapQueue(handleData, () => `read_${id}`),
    );
  this.sockets.set(id, socket);
  this.emit("connect", id);
}

function bindSocketLog(socket: net.Socket) {
  const prefix = "[server.socket]";
  socket
    .on("error", (err) => {
      logger.log(prefix, `error`, "code" in err ? err.code : err.message);
    })
    .on("close", (hadError) => {
      logger.log(prefix, `close`, { hadError });
    })
    .on("data", (data) => {
      logger.log(prefix, `data`, data.toString("utf8"));
    });
}

function bindServerLog(server: net.Server) {
  const prefix = "[server.Server]";
  server
    .on("error", (err) => {
      logger.log(prefix, `error`, "code" in err ? err.code : err.message);
    })
    .on("close", () => {
      logger.log(prefix, `close`);
    });
}
