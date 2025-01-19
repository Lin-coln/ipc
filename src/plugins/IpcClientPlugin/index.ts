import net from "node:net";
import { ClientEvents, ClientPlugin, Logger } from "@interfaces/index";
import EventBus from "@utils/EventBus";
import { PromiseHub } from "@utils/wrapSinglePromise";
import { QueueHub } from "@utils/Queue";
import { connect, enhanceConnect } from "./connect";
import { useBeforeMiddleware, withMiddleware } from "@utils/middleware";
import { write } from "./write";
import {
  disconnect,
  enhanceDisconnect,
  wrapDisconnectEffect,
} from "./disconnect";

// const logger: Logger = console;
const logger: Logger = { log() {} };

export class IpcClientPlugin
  extends EventBus<ClientEvents>
  implements ClientPlugin<net.IpcSocketConnectOpts>
{
  queueHub: QueueHub;
  promiseHub: PromiseHub;
  socket: net.Socket;
  connOpts: net.IpcSocketConnectOpts | null;
  constructor(opts: net.SocketConstructorOpts) {
    super();
    this.queueHub = new QueueHub();
    this.promiseHub = new PromiseHub();
    this.socket = new net.Socket(opts);
    this.connOpts = null;

    // add logger to emit
    this.emit = withMiddleware(
      this.emit,
      useBeforeMiddleware(([event]) => logger.log(`[client] emit`, event)),
    );

    enhanceConnect.call(this, logger);
    enhanceDisconnect.call(this, logger);

    this.connect = this.promiseHub.wrapLock(this.connect, "connect");
    this.disconnect = this.promiseHub.wrapLock(this.disconnect, "disconnect");
    this.write = this.queueHub.wrapQueue(this.write, () => "write");
  }

  get remoteIdentifier(): string | null {
    if (!this.connOpts) return null;
    return `pipe://${this.connOpts.path}`;
  }

  async connect(connOpts: net.IpcSocketConnectOpts): Promise<this> {
    const socket = this.socket;
    // connected
    if (!socket.connecting && !socket.pending) return this;

    logger.log(`[client.socket] connect...`);
    await connect(socket, connOpts);
    bindSocketLog(socket);
    const handleClosed = wrapDisconnectEffect.call(this, () => {
      socket.removeAllListeners();
      socket.destroy();
      return false;
    });
    socket
      .on("error", (err: Error) => {
        this.emit("error", err);
        if (socket.closed) handleClosed();
      })
      .on("close", (hadError: boolean) => {
        if (hadError) return;
        handleClosed();
      })
      .on("data", (data: Buffer) => {
        this.emit("data", data);
      });

    this.connOpts = connOpts;
    this.emit("connect");
    return this;
  }

  async disconnect(): Promise<this> {
    const socket = this.socket;
    await disconnect(socket);
    return this;
  }

  async write(data: Buffer): Promise<this> {
    const socket = this.socket;
    logger.log(`[client.socket] write`, data.toString("utf8"));
    await write(socket, data);
    return this;
  }
}

function bindSocketLog(socket: net.Socket) {
  const prefix = "[client.socket]";
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
