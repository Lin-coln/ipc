import net from "node:net";
import fs from "node:fs";
import process from "node:process";
import { Logger, ServerEvents, ServerPlugin } from "@interfaces/index";
import EventBus from "@utils/EventBus";
import useCleanup from "@utils/useCleanup";
import { uuid } from "@utils/uuid";
import fixPipeName from "@utils/fixPipeName";
import wrapSinglePromise from "@utils/wrapSinglePromise";
import { QueueHub } from "@utils/Queue";

// const logger: Logger = console;
const logger: Logger = { log() {} };

export class IpcServerPlugin
  extends EventBus<ServerEvents>
  implements ServerPlugin<net.ListenOptions>
{
  queueHub: QueueHub;
  server: net.Server;
  sockets: Map<string, net.Socket>;
  constructor(opts: net.ServerOpts) {
    super();
    this.queueHub = new QueueHub();
    this.server = new net.Server(opts);
    this.sockets = new Map();
    enhanceServer.call(this);
    this.listen = wrapSinglePromise(this.listen);
    this.disconnect = wrapSinglePromise(this.disconnect, (id) => id);
    this.close = wrapSinglePromise(this.close);
    this.write = this.queueHub.wrapQueue(this.write, (id) => `write_${id}`);
  }

  async listen(opts: net.ListenOptions): Promise<this> {
    if (this.server.listening) return this;

    await new Promise<void>((resolve, reject) => {
      try {
        if (this.server.listening)
          throw new Error(`failed to listen - listening`);
        logger.log(`[server.server] listen...`);
        this.server.on("error", reject).on("listening", resolve).listen(opts);
      } catch (e) {
        reject(e);
      }
    }).finally(() => {
      this.server.removeAllListeners();
    });

    this.server
      .on("error", (err) => {
        logger.log(
          `[server.server] error`,
          "code" in err ? err.code : err.message,
        );
        // todo: handle error
        logger.log(`[server] emit error`);
        this.emit("error", err);
      })
      .on("close", () => {
        logger.log(`[server.server] close`);
        this.server.removeAllListeners();
        logger.log(`[server] emit close`);
        this.emit("close");
      })
      // todo: listening-connection issue
      .on("connection", handleSocketConnection.bind(this));
    logger.log(`[server] emit listening`);
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
    logger.log(`[server] emit disconnect`, id);
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

    return new Promise((resolve, reject) => {
      const handler: ServerEvents["disconnect"] = (ctx) => {
        if (ctx.id !== id) return;
        this.off("disconnect", handler);
        reject(new Error(`[server] failed to write - disconnect`));
      };
      this.on("disconnect", handler);
      socket.once("drain", () => {
        this.write(id, data).then(resolve, reject);
      });
    });
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

  const handleData = this.queueHub.wrapQueue(
    async (data: Buffer) => {
      logger.log(`[server.socket] data`, data.toString("utf8"));
      logger.log(`[server] emit data`);
      this.emit("data", id, data);
    },
    () => `read_${id}`,
  );

  socket
    .on("error", (err) => {
      logger.log(
        `[server.socket] error`,
        "code" in err ? err.code : err.message,
      );
      logger.log(`[server] emit error`);
      this.emit("error", err);
    })
    .on("close", (hadError: boolean) => {
      logger.log(`[server.socket] close`);
      if (hadError) return;

      this.sockets.delete(id);
      this.queueHub.clear(`write_${id}`);
      this.queueHub.clear(`read_${id}`);
      socket.removeAllListeners();
      logger.log(`[server.socket] destroying`);
      socket.destroy();
      logger.log(`[server] emit disconnect`, id);
      this.emit("disconnect", { id, passive: true });
    })
    .on("data", handleData);
  this.sockets.set(id, socket);
  logger.log(`[server] emit connect`);
  this.emit("connect", id);
}
