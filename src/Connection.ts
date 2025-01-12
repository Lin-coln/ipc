import { IpcClientPlugin } from "./plugins/IpcClientPlugin";
import net from "node:net";
import EventBus from "@utils/EventBus";
import {
  IClient,
  IClientConnOpts,
  IClientEvents,
  IClientMessage,
} from "@interfaces/index";

type PresetClientPlugin = IpcClientPlugin;
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
  }

  get remoteIdentifier(): string | null {
    if (!this.#plugin) return null;
    return this.#plugin.remoteIdentifier;
  }
  async connect(opts: IClientConnOpts) {
    let connOpts: any;
    if ("path" in opts) {
      connOpts = { path: opts.path } as net.IpcSocketConnectOpts;
      this.#plugin = new IpcClientPlugin({});
    }
    const plugin = this.#plugin!;
    await plugin
      .on("error", (err) => {
        this.emit("error", err);
      })
      .on("disconnect", () => {
        this.disconnect();
      })
      .on("data", (data) => {
        this.emit("message", this.onDeserialize(data) as ReceivedMsg);
      })
      .connect(connOpts);
    this.emit("connect");
    return this;
  }
  async disconnect() {
    if (!this.#plugin)
      throw new Error("Failed to disconnect - plugin not found");
    await this.#plugin.disconnect();
    this.#plugin = null;
    this.emit("disconnect");
    this.off();
  }

  async write(data: Buffer) {
    if (!this.#plugin) throw new Error("Failed to write - plugin not found");
    await this.#plugin.write(data);
    return this;
  }

  async postMessage(data: PostMsg) {
    await this.write(this.onSerialize(data));
    return this;
  }

  onSerialize(data: IClientMessage): Buffer {
    if (typeof data !== "string") {
      data = JSON.stringify(data);
    }
    return Buffer.from(data, "utf8");
  }

  onDeserialize(data: Buffer): IClientMessage {
    const raw = data.toString("utf8");
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}
