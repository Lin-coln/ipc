import { IpcClientPlugin } from "./plugins/IpcClientPlugin";
import net from "node:net";
import EventBus from "@utils/EventBus";
import {
  IClient,
  IClientConnOpts,
  IClientEvents,
  IClientMessage,
} from "@interfaces/index";
import { PromiseHub } from "@utils/wrapSinglePromise";

type PresetClientPlugin = IpcClientPlugin;
type PresetClientParams = {
  type: "ipc";
  class: typeof IpcClientPlugin;
  connOpts: Parameters<IpcClientPlugin["connect"]>[0];
};

type DataInterceptor = {
  onEncode: (data: Buffer) => Buffer;
  onDecode: (data: Buffer) => Buffer;
};

export class Client<
    PostMsg extends IClientMessage = IClientMessage,
    ReceivedMsg extends IClientMessage = PostMsg,
  >
  extends EventBus<IClientEvents<ReceivedMsg>>
  implements IClient<PostMsg, ReceivedMsg>
{
  #plugin: PresetClientPlugin | null;
  #promiseHub: PromiseHub;
  interceptors: DataInterceptor[];

  constructor() {
    super();
    this.#plugin = null;
    this.#promiseHub = new PromiseHub();
    this.interceptors = [];

    const promiseHub = this.#promiseHub;
    this.connect = promiseHub.wrapSinglePromise(this.connect, "connect");
    this.disconnect = promiseHub.wrapSinglePromise(
      this.disconnect,
      "disconnect",
    );
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
        // this.onReceiveData(data);
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

  // DelimiterBasedFrameDecode

  /**
   * - postMessage(msg:PostMsg);
   * - write(frame:Buffer);
   * - write(data:Buffer);
   * - read(data:Buffer);
   * - read(frame:Buffer);
   * - receiveMessage(msg:ReceivedMsg);
   */

  async write(data: Buffer) {
    const plugin = this.#plugin!;
    await plugin.write(data);
    return this;
  }

  // async postMessage(data: PostMsg) {
  //   await this.write(this.onWriteData(this.onSerialize(data)));
  //   return this;
  // }

  // onSerialize(data: IClientMessage): Buffer {
  //   let raw: string;
  //   if (typeof data !== "string") {
  //     raw = JSON.stringify(data);
  //   } else {
  //     raw = data;
  //   }
  //   return Buffer.from(raw, "utf8");
  // }

  // onDeserialize(data: Buffer): IClientMessage {
  //   const raw: any = data.toString("utf8");
  //   try {
  //     return JSON.parse(raw);
  //   } catch {
  //     return raw;
  //   }
  // }

  // protected onWriteData(data: Buffer) {
  //   return Buffer.concat([data, Buffer.from("\f", "utf8")]);
  // }

  // protected currentBuffer: Buffer = Buffer.alloc(0);

  // protected onReceiveData(data: Buffer) {
  //   const symbol = Buffer.from("\f", "utf8");
  //
  //   const idx = data.indexOf(symbol);
  //
  //   if (idx === -1) {
  //     this.currentBuffer = Buffer.concat([this.currentBuffer, data]);
  //     return;
  //   }
  //
  //   const totalData = Buffer.concat([
  //     this.currentBuffer,
  //     data.subarray(0, idx),
  //   ]);
  //   this.currentBuffer = Buffer.alloc(0);
  //   this.emit("message", this.onDeserialize(totalData) as ReceivedMsg);
  //
  //   const remain = data.subarray(idx + 1);
  //   if (remain.length) {
  //     this.onReceiveData(remain);
  //   }
  // }
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
