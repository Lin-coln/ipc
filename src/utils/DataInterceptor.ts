import Queue from "./Queue"; //

type MessageDispatcherOptions<PostMsg, ReceivedMsg> = {
  onWrite(data: Buffer): Promise<void>;
  onMessage(msg: ReceivedMsg): Promise<void>;
  onEncode(msg: PostMsg): Promise<Buffer>;
  onDecode(data: Buffer): Promise<ReceivedMsg>;
};

export class MessageDispatcher<PostMsg, ReceivedMsg> {
  receivedData: Buffer;
  splitSymbol: Buffer;
  onWrite: MessageDispatcherOptions<PostMsg, ReceivedMsg>["onWrite"];
  onMessage: MessageDispatcherOptions<PostMsg, ReceivedMsg>["onMessage"];
  onEncode: MessageDispatcherOptions<PostMsg, ReceivedMsg>["onEncode"];
  onDecode: MessageDispatcherOptions<PostMsg, ReceivedMsg>["onDecode"];

  constructor(opts: MessageDispatcherOptions<PostMsg, ReceivedMsg>) {
    this.receivedData = Buffer.alloc(0);
    this.splitSymbol = Buffer.from("\f", "utf8");
    this.onWrite = opts.onWrite;
    this.onMessage = opts.onMessage;
    this.onEncode = opts.onEncode;
    this.onDecode = opts.onDecode;
    // const writeQueue = new Queue();
    // const messageQueue = new Queue();
    // const chunkQueue = new Queue();
    // this.onWrite = writeQueue.wrap(this.onWrite);
    // this.onMessage = messageQueue.wrap(this.onMessage);
    // this.handleChunk = chunkQueue.wrap(this.handleChunk);
  }

  public async postMessage(msg: PostMsg): Promise<this> {
    let data: Buffer = await this.onEncode(msg);
    data = Buffer.concat([data, this.splitSymbol]);
    await this.onWrite(data);
    return this;
  }

  public async handleChunk(chunk: Buffer): Promise<void> {
    const idx = chunk.indexOf(this.splitSymbol);

    if (idx === -1) {
      this.receivedData = Buffer.concat([this.receivedData, chunk]);
      return;
    }

    const totalData = Buffer.concat([
      this.receivedData,
      chunk.subarray(0, idx),
    ]);
    this.receivedData = Buffer.alloc(0);

    await this.onMessage(await this.onDecode(totalData));
    // this.emit("message", this.onDeserialize(totalData) as ReceivedMsg);

    const remain = chunk.subarray(idx + this.splitSymbol.length);
    if (remain.length) {
      await this.handleChunk(remain);
    }
  }
}
