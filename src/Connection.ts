import * as net from "node:net";
import * as process from "node:process";
import EventBus from "./utils/EventBus";
import {
  ClientEvents,
  ClientPlugin,
  ServerEvents,
  ServerPlugin,
} from "./interfaces";
import wrapRetry from "./utils/wrapRetry";
import useCleanup from "./utils/useCleanup";
import fs from "node:fs";
import { createPromise } from "./utils/promise";
import { uuid } from "./utils/uuid";

export class IpcClientPlugin
  extends EventBus<ClientEvents>
  implements ClientPlugin<net.IpcSocketConnectOpts>
{
  socket: net.Socket;
  connOpts: net.IpcSocketConnectOpts | null;
  constructor(opts: net.SocketConstructorOpts) {
    super();
    this.socket = new net.Socket(opts);
    this.connOpts = null;
    enhanceClient.call(this);
    this.on("disconnect", () => this.off());
  }
  get remoteIdentifier() {
    if (!this.connOpts) return null;
    return `pipe::${this.connOpts.path}`;
  }
  async connect(opts: net.IpcSocketConnectOpts) {
    await new Promise<void>((resolve, reject) => {
      try {
        if (this.socket.connecting)
          throw new Error(`failed to connect - connecting`);
        if (!this.socket.pending)
          throw new Error(`failed to connect - not pending`);
        this.socket.on("error", reject).on("connect", resolve).connect(opts);
      } catch (e) {
        reject(e);
      }
    }).finally(() => {
      this.socket.removeAllListeners();
    });

    this.socket
      .on("error", (err) => {
        console.log(`[socket] error`, err.message);
        this.emit("error", err);
        this.disconnect(err);
      })
      .on("close", (hadError: boolean) => {
        if (hadError) return;
        this.disconnect();
      })
      // todo: connect-data issue
      .on("data", (data) => this.emit("data", data));
    this.connOpts = opts;
    this.emit("connect");
    return this;
  }
  async disconnect(err?: Error) {
    this.socket.removeAllListeners();
    this.socket.destroy(err);
    this.connOpts = null;
    this.emit("disconnect");
  }
  write(data: Buffer): boolean {
    return this.socket.write(data);
  }
}

function enhanceClient(this: IpcClientPlugin) {
  // retry feature
  this.connect = wrapRetry({
    onExecute: this.connect.bind(this),
    onCheck: (e) =>
      "code" in e && ["ENOENT", "ECONNREFUSED"].includes(e.code as string),
    beforeRetry: ({ count, times, error }) =>
      console.log(
        `[socket] reconnect (${count}/${times})`,
        "code" in error ? error.code : error.message,
      ),
  });
}

/////////////////////////////////////////////////////////////////////

export class IpcServerPlugin
  extends EventBus<ServerEvents>
  implements ServerPlugin<net.ListenOptions>
{
  server: net.Server;
  sockets: Map<string, net.Socket>;
  constructor(opts: net.ServerOpts) {
    super();
    this.server = new net.Server(opts);
    this.sockets = new Map();
    enhanceServer.call(this);
    this.on("close", () => this.off());
  }
  async listen(opts: net.ListenOptions) {
    await new Promise<void>((resolve, reject) => {
      try {
        if (this.server.listening)
          throw new Error(`failed to listen - listening`);
        this.server.on("error", reject).on("listening", resolve).listen(opts);
      } catch (e) {
        reject(e);
      }
    }).finally(() => {
      this.server.removeAllListeners();
    });

    this.server
      .on("error", (err) => {
        console.log(`[server] error`, err.message);
        this.emit("error", err);
        this.close();
      })
      .on("close", () => {
        // ...
        this.close();
      })
      // todo: listening-connection issue
      .on("connection", handleSocketConnection.bind(this));
    this.emit("listening");
    return this;
  }
  async close(): Promise<void> {
    const closePromise = createPromise();
    this.server.close((err?: Error) =>
      err ? closePromise.reject(err) : closePromise.resolve(void 0),
    );

    return closePromise.then(() => {
      this.server.removeAllListeners();
      this.emit("close");
    });
  }
  write(id: string, data: Buffer): boolean {
    const socket = this.sockets.get(id);
    if (!socket) {
      throw new Error(`[server] failed to write - socket not found: ${id}`);
    }
    return socket.write(data);
  }
}

function enhanceServer(this: IpcServerPlugin) {
  const listen = this.listen.bind(this);
  this.listen = function (this: IpcClientPlugin, opts: net.ListenOptions) {
    let sockPath = opts.path;
    if (!sockPath) return listen.call(this, opts);

    // fix socket path
    if (process.platform === "win32") {
      const winPrefixes = [`\\\\.\\pipe\\`, `\\\\?\\pipe\\`];
      if (!winPrefixes.some((p) => sockPath!.startsWith(p))) {
        sockPath = sockPath.replace(/^\//, "").replace(/\//g, "-");
        sockPath = `\\\\.\\pipe\\${sockPath}`;
      }
    }

    // wrap clear sock file
    const clearSock = () => fs.existsSync(sockPath) && fs.unlinkSync(sockPath);
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
  console.log(`[server] connected socket: ${id}`);

  const onSocketRemove = () => {
    this.sockets.delete(id);
  };
  const onSocketData = (data: Buffer) => {
    this.emit("data", data, { id, reply: this.write.bind(this, id) });
  };
  socket
    .on("error", (e) => {
      console.log(`[server.socket] error: ${id}`, e);
      onSocketRemove();
    })
    .on("close", () => {
      console.log(`[server.socket] close: ${id}`);
      onSocketRemove();
    })
    .on("data", (data) => {
      console.log(`[server.socket] data: ${id} - ${data.toString("utf8")}`);
      onSocketData(data);
    });
  this.sockets.set(id, socket);
}

/////////////////////////////////////////////////////////////////////
