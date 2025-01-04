import { uuid } from "./utils";
import * as events from "node:events";
import * as net from "node:net";
import * as fs from "node:fs";
import useCleanup from "./useCleanup";
import { XX } from "./interface";

export class SocketConnection
  extends events.EventEmitter
  implements XX.Connection<net.SocketConnectOpts>
{
  id: string;
  state: XX.ConnectionState;
  socket: net.Socket;

  constructor(
    opts: {
      id?: string;
      // ...
      state?: XX.ConnectionState;
      socket?: net.Socket;
    } = {},
  ) {
    super();
    this.id = opts.id ?? uuid();
    this.state = opts.state ?? "disconnected";
    this.socket = opts.socket ?? new net.Socket();

    if (this.state === "connected") {
      this.registrySocketEvents(this.socket, {});
    }
  }

  async connect(
    opts: net.SocketConnectOpts,
    { reconnect }: { reconnect?: boolean } = {},
  ) {
    if (this.state !== "disconnected" && !reconnect) {
      throw new Error(`[socket] failed to connect state(${this.state})`);
    }
    this.state = "connecting";
    console.log(`[socket] ${reconnect ? "reconnecting" : "connecting"}...`);

    const times = 30;
    const delay = 1_000;
    let count = 0;

    while (true) {
      try {
        await connect.call(this);
        break;
      } catch (e: any) {
        const shouldRetry =
          "code" in e && ["ENOENT", "ECONNREFUSED"].includes(e.code);
        if (shouldRetry) {
          if (++count <= times) {
            console.log(
              `[socket] reconnecting... (${count}/${times}), ${e.code}`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }
        this.state = "disconnected";
        console.log(
          `[socket] failed to ${reconnect ? "reconnect" : "connect"},`,
          e.message,
        );
        throw e;
      }
    }

    async function connect(this: SocketConnection) {
      await new Promise<void>((resolve, reject) => {
        this.socket
          .once("error", reject)
          .once("connect", resolve)
          .connect(opts);
      }).finally(() => {
        this.socket.removeAllListeners();
      });

      this.state = "connected";
      this.registrySocketEvents(this.socket, { connOpts: opts });
      // if (!reconnect) {
      //   this.emit("connected");
      // }
      this.emit("connected");
    }
  }

  disconnect() {
    this.state = "disconnected";
    this.socket.destroy();
  }

  write(data: Buffer): boolean {
    return this.socket.write(data);
  }

  private registrySocketEvents(
    socket: net.Socket,
    {
      connOpts,
    }: {
      connOpts?: net.SocketConnectOpts;
    },
  ) {
    socket
      .on("data", (data: Buffer) => {
        this.emit("data", data);
      })
      .on("end", () => {
        console.log(`[socket] end`);
      })
      .on("error", (err) => {
        console.log(`[socket] error`, err.message);
        // this.emit("error", err);
        throw err;
      })
      .on("close", handleSocketClose.bind(this));
    function handleSocketClose(this: SocketConnection) {
      console.log(`[socket] close`);
      socket.removeAllListeners();

      const shouldReconnect = !!connOpts && this.state === "connected";
      console.log(`[socket]`, { shouldReconnect }, this.state);
      if (shouldReconnect) {
        this.connect(connOpts, { reconnect: true }).catch(onClose.bind(this));
        return;
      }

      onClose.call(this);

      function onClose(this: SocketConnection) {
        this.once("close", () => this.removeAllListeners()).emit("close");
      }
    }
  }
}

export class ConnectionManager
  extends events.EventEmitter
  implements XX.ConnectionManager
{
  connections: Map<string, XX.Connection>;

  server: net.Server | null;

  constructor() {
    super();
    this.connections = new Map();
    this.server = null;
  }

  async listen(listenOpts: net.ListenOptions) {
    if (!this.server) {
      this.server = new net.Server().on("connection", (socket: net.Socket) => {
        const conn = this.generateConnection({ state: "connected", socket })
          // socket connected
          .on("connected", () => {
            // console.log(`[conn] server connected`, conn.id);
          });
        conn.emit("connected");
      });
    }

    const server = this.server;
    await new Promise<void>((resolve) => {
      // delete sock file
      useCleanup(() => {
        if (listenOpts.path && fs.existsSync(listenOpts.path)) {
          fs.unlinkSync(listenOpts.path);
        }
      });
      server.listen(listenOpts, resolve);
    });
  }

  async connect(connOpts: net.SocketConnectOpts) {
    const conn = this.generateConnection({}).on("connected", () => {
      // console.log(`[conn] client connected`, conn.id);
    });
    await conn.connect(connOpts);
  }

  postMessage(connId: string, data: object) {
    const conn = this.connections.get(connId);
    if (!conn) {
      throw new Error(`conn not found. ${connId}`);
    }

    const serialized = this.onSerialize(data);
    conn.write(serialized);

    return Promise.resolve();
  }

  protected generateConnection(
    opts: ConstructorParameters<typeof SocketConnection>[0] = {},
  ) {
    const conn = new SocketConnection(opts)
      .on("close", () => {
        this.connections.delete(conn.id);
        this.emit("disconnected", conn.id);
      })
      .on("connected", () => {
        this.connections.set(conn.id, conn);
        this.emit("connected", conn.id);
      })
      .on("data", (data: Buffer) => {
        this.emit("message", conn.id, this.onDeserialize(data));
      });
    return conn;
  }

  protected onSerialize(data: object): Buffer {
    return Buffer.from(JSON.stringify(data), "utf-8");
  }

  protected onDeserialize(data: Buffer): object | string {
    let deserialized = data.toString("utf-8");
    try {
      deserialized = JSON.parse(deserialized);
    } catch {
      // ...
    }
    return deserialized;
  }
}
