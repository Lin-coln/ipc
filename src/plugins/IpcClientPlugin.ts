import net from "node:net";
import { ClientEvents, ClientPlugin, Logger } from "@interfaces/index";
import EventBus from "@utils/EventBus";
import wrapRetry from "@utils/wrapRetry";
import fixPipeName from "@utils/fixPipeName";
import wrapSinglePromise from "@utils/wrapSinglePromise";
import { QueueHub } from "@utils/Queue";

// const logger: Logger = console;
const logger: Logger = { log() {} };

export class IpcClientPlugin
  extends EventBus<ClientEvents>
  implements ClientPlugin<net.IpcSocketConnectOpts>
{
  queueHub: QueueHub;
  socket: net.Socket;
  connOpts: net.IpcSocketConnectOpts | null;
  constructor(opts: net.SocketConstructorOpts) {
    super();
    this.queueHub = new QueueHub();
    this.socket = new net.Socket(opts);
    this.connOpts = null;
    enhanceClient.call(this);
    this.connect = wrapSinglePromise(this.connect);
    this.disconnect = wrapSinglePromise(this.disconnect);
    this.write = this.queueHub.wrapQueue(this.write, () => "write");
  }

  get remoteIdentifier(): string | null {
    if (!this.connOpts) return null;
    return `pipe://${this.connOpts.path}`;
  }

  async connect(opts: net.IpcSocketConnectOpts): Promise<this> {
    if (!this.socket.connecting && !this.socket.pending) {
      // connected
      return this;
    }
    await new Promise<void>((resolve, reject) => {
      try {
        if (this.socket.connecting)
          throw new Error(`failed to connect - connecting`);
        if (!this.socket.pending)
          throw new Error(`failed to connect - not pending`);
        logger.log(`[client.socket] connect...`);
        this.socket.on("error", reject).on("connect", resolve).connect(opts);
      } catch (e) {
        reject(e);
      }
    }).finally(() => {
      this.socket.removeAllListeners();
    });

    const handleData = this.queueHub.wrapQueue(
      async (data: Buffer) => {
        logger.log(`[client.socket] data`, data.toString("utf8"));
        logger.log(`[client] emit data`);
        this.emit("data", data);
      },
      () => "read",
    );

    this.socket
      .on("error", (err) => {
        logger.log(
          `[client.socket] error`,
          "code" in err ? err.code : err.message,
        );
        // todo: handle error
        logger.log(`[client] emit error`);
        this.emit("error", err);
      })
      .on("close", (hadError: boolean) => {
        logger.log(`[client.socket] close`, { hadError });
        if (hadError) return;
        const identifier = this.remoteIdentifier!;
        this.queueHub.clear("write");
        this.queueHub.clear("read");
        handleClientDisconnected.call(this);
        logger.log(`[client] emit disconnect`);
        this.emit("disconnect", { identifier, passive: true });
      })
      // todo: connect-data issue
      .on("data", handleData);
    handleClientConnected.call(this, opts);
    logger.log(`[client] emit connect`, this.remoteIdentifier);
    this.emit("connect");

    return this;
  }

  /**
   * 1. removeAllListeners
   * 2. end
   * 3. destroy
   * 4. emit disconnect
   */
  async disconnect(): Promise<this> {
    if (this.socket.closed) return this;
    this.socket.removeAllListeners();
    this.queueHub.clear("write");
    this.queueHub.clear("read");
    await new Promise<void>((resolve, reject) => {
      try {
        logger.log(`[client.socket] ending`);
        this.socket.end(() => resolve());
      } catch (e) {
        reject(e);
      }
    });
    const identifier = this.remoteIdentifier!;
    handleClientDisconnected.call(this);
    logger.log(`[client] emit disconnect`);
    this.emit("disconnect", { identifier, passive: false });
    return this;
  }

  async write(data: Buffer): Promise<this> {
    const socket = this.socket;
    if (socket.pending)
      // not connected
      throw new Error(`[client] failed to write - not connected`);

    logger.log(`[client.socket] write`, data.toString("utf8"));

    const remain = socket.writableHighWaterMark - socket.writableLength;
    // write directly
    if (remain >= data.length) {
      const done = socket.write(data);
      if (done) {
        return this;
      }
    }

    // write by chunk
    if (data.length >= socket.writableHighWaterMark || data.length > remain) {
      const chunkSize = 1024;
      let index = 0;
      let chunk: Buffer;
      while (true) {
        if (index >= data.length) break;

        chunk = data.subarray(index, index + chunkSize);
        await this.write(chunk);
        index += chunkSize;
      }
      return this;
    }

    // wait drain
    return new Promise((resolve, reject) => {
      const handler: ClientEvents["disconnect"] = (ctx) => {
        this.off("disconnect", handler);
        reject(new Error(`[client] failed to write - disconnect`));
      };
      this.on("disconnect", handler);
      socket.once("drain", () => {
        this.write(data).then(resolve, reject);
      });
    });
  }
}

function enhanceClient(this: IpcClientPlugin) {
  // 1. connect
  // fix pipe name on win32 platform
  const connect = this.connect;
  this.connect = function (
    this: IpcClientPlugin,
    opts: net.IpcSocketConnectOpts,
  ) {
    return connect.call(this, { ...opts, path: fixPipeName(opts.path) });
  };

  // retry feature
  this.connect = wrapRetry({
    times: 30,
    delay: 1_000,
    onExecute: this.connect.bind(this),
    onCheck: (e) =>
      "code" in e && ["ENOENT", "ECONNREFUSED"].includes(e.code as string),
    beforeRetry: ({ count, times, error }) =>
      logger.log(
        `[socket] reconnect (${count}/${times})`,
        "code" in error ? error.code : error.message,
      ),
  });
}

function handleClientConnected(
  this: IpcClientPlugin,
  opts: net.IpcSocketConnectOpts,
) {
  this.connOpts = opts;
}

function handleClientDisconnected(this: IpcClientPlugin) {
  this.socket.removeAllListeners();
  logger.log(`[client.socket] destroying`);
  this.socket.destroy();
  this.connOpts = null;
}
