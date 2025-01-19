import net from "node:net";
import { ClientEvents, ClientPlugin, Logger } from "@interfaces/index";
import EventBus from "@utils/EventBus";
import wrapRetry from "@utils/wrapRetry";
import { PromiseHub } from "@utils/wrapSinglePromise";
import { QueueHub } from "@utils/Queue";
import { bindSocketLog, connect } from "./connect";
import { useBeforeMiddleware, withMiddleware } from "@utils/middleware";
import { write } from "./write";

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
    enhanceClient.call(this);

    const queueHub = this.queueHub;
    const promiseHub = this.promiseHub;
    this.connect = promiseHub.wrapSinglePromise(this.connect, "connect");
    this.disconnect = promiseHub.wrapSinglePromise(
      this.disconnect,
      "disconnect",
    );
    this.write = queueHub.wrapQueue(this.write, () => "write");
  }

  get remoteIdentifier(): string | null {
    if (!this.connOpts) return null;
    return `pipe://${this.connOpts.path}`;
  }

  async connect(connOpts: net.IpcSocketConnectOpts): Promise<this> {
    // connected
    if (!this.socket.connecting && !this.socket.pending) return this;

    logger.log(`[client.socket] connect...`);
    await connect(this.socket, connOpts);
    bindSocketLog(this.socket, logger);

    const handleClose = () => {
      const identifier = this.remoteIdentifier!;
      this.queueHub.clear("write");
      handleClientDisconnected.call(this);
      this.emit("disconnect", { identifier, passive: true });
    };

    this.socket
      .on("error", (err: Error) => {
        this.emit("error", err);
        if (this.socket.closed) handleClose();
      })
      .on("close", (hadError: boolean) => {
        if (hadError) return;
        handleClose();
      })
      .on("data", (data: Buffer) => {
        this.emit("data", data);
      });

    this.connOpts = connOpts;
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
    this.emit("disconnect", { identifier, passive: false });
    return this;
  }

  async write(data: Buffer): Promise<this> {
    const socket = this.socket;
    if (socket.pending)
      // not connected
      throw new Error(`[client] failed to write - not connected`);
    logger.log(`[client.socket] write`, data.toString("utf8"));
    await write(socket, data);
    return this;
  }
}

function enhanceClient(this: IpcClientPlugin) {
  // add logger to emit
  this.emit = withMiddleware(
    this.emit.bind(this),
    useBeforeMiddleware(([event]) => logger.log(`[client] emit`, event)),
  );

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

function handleClientDisconnected(this: IpcClientPlugin) {
  this.socket.removeAllListeners();
  logger.log(`[client.socket] destroying`);
  this.socket.destroy();
  this.connOpts = null;
}
