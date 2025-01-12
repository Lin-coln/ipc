import { IpcClientPlugin } from "./plugins/IpcClientPlugin";
import net from "node:net";
import EventBus from "@utils/EventBus";
import {
  IClient,
  IClientConnOpts,
  IClientEvents,
  IClientMessage,
} from "@interfaces/index";
import wrapSinglePromise from "@utils/wrapSinglePromise";

type PresetClientPlugin = IpcClientPlugin;
type PresetClientParams = {
  type: "ipc";
  class: typeof IpcClientPlugin;
  connOpts: Parameters<IpcClientPlugin["connect"]>[0];
};

export class Client<
    PostMsg extends IClientMessage = IClientMessage,
    ReceivedMsg extends IClientMessage = PostMsg,
  >
  extends EventBus<IClientEvents<ReceivedMsg>>
  implements IClient<PostMsg, ReceivedMsg>
{
  #plugin: PresetClientPlugin | null;
  constructor() {
    super();
    this.#plugin = null;
    this.connect = wrapSinglePromise(this.connect);
    this.disconnect = wrapSinglePromise(this.disconnect);
  }

  get remoteIdentifier(): string | null {
    return this.#plugin?.remoteIdentifier ?? null;
  }

  async connect(opts: IClientConnOpts) {
    if (this.#plugin !== null) return this;

    const params = parseClientConnOpts(opts);
    this.#plugin = new params.class({})
      .on("error", (err) => {
        this.emit("error", err);
      })
      .on("disconnect", (ctx) => {
        if (!ctx.passive) return;
        this.#plugin = null;
        plugin.off();
        this.emit("disconnect", ctx);
      })
      .on("data", (data) => {
        this.emit("message", this.onDeserialize(data) as ReceivedMsg);
      });

    const plugin = this.#plugin;
    await plugin.connect(params.connOpts as any);
    this.emit("connect");

    return this;
  }

  async disconnect() {
    if (this.#plugin === null) return this;
    const plugin = this.#plugin!;
    const identifier = this.remoteIdentifier!;

    this.#plugin = null;
    await plugin.disconnect();
    this.emit("disconnect", { identifier, passive: false });
    return this;
  }

  async write(data: Buffer) {
    const plugin = this.#plugin!;
    await plugin.write(data);
    return this;
  }

  async postMessage(data: PostMsg) {
    await this.write(this.onSerialize(data));
    return this;
  }

  onSerialize(data: PostMsg | ReceivedMsg): Buffer {
    let raw: string;
    if (typeof data !== "string") {
      raw = JSON.stringify(data);
    } else {
      raw = data;
    }
    return Buffer.from(raw, "utf8");
  }

  onDeserialize(data: Buffer): PostMsg | ReceivedMsg {
    const raw: any = data.toString("utf8");
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}

function parseClientConnOpts(opts: IClientConnOpts): PresetClientParams {
  let type: PresetClientParams["type"];
  let clazz: PresetClientParams["class"];
  let connOpts: PresetClientParams["connOpts"];
  if ("path" in opts) {
    type = "ipc";
    clazz = IpcClientPlugin;
    connOpts = { path: opts.path } as net.IpcSocketConnectOpts;
  } else {
    throw new Error(`failed to parse ClientConnOpts`);
  }

  return {
    type,
    class: clazz,
    connOpts,
  };
}
