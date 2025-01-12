import EventBus from "@utils/EventBus";

export interface Logger {
  log: (...args: any[]) => void;
}

export interface ClientEvents {
  error(err: Error): void;
  disconnect(ctx: { passive: boolean }): void;
  connect(): void;
  data(data: Buffer): void;
}

export interface ClientPlugin<ConnOpts> extends EventBus<ClientEvents> {
  readonly remoteIdentifier: string | null;
  connect(opts: ConnOpts): Promise<this>;
  disconnect(): Promise<this>;
  write(data: Buffer): Promise<this>;
}

export interface ServerEvents {
  error(err: Error): void;
  close(): void;
  listening(): void;
  connect(id: string): void;
  disconnect(ctx: { id: string; passive: boolean }): void;
  data(id: string, data: Buffer): void;
}

export interface ServerPlugin<ListenOpts> extends EventBus<ServerEvents> {
  listen(opts: ListenOpts): Promise<this>;
  close(): Promise<this>;
  disconnect(id: string): Promise<this>;
  write(id: string, data: Buffer): Promise<this>;
}

///////////////////////////////////////////////////////////////////////////////////////

export type IClientConnOpts = { path: string };
export type IClientMessage = object | string;
export interface IClientEvents<ReceivedMsg = IClientMessage> {
  error(err: Error): void;
  disconnect(err?: Error): void;
  connect(): void;
  message(message: ReceivedMsg): void;
}
export interface IClient<
  PostMsg extends IClientMessage = IClientMessage,
  ReceivedMsg extends IClientMessage = IClientMessage,
> extends EventBus<IClientEvents<ReceivedMsg>> {
  readonly remoteIdentifier: string | null;
  connect(opts: IClientConnOpts): Promise<this>;
  disconnect(err?: Error): Promise<void>;
  write(data: Buffer): Promise<this>;
  postMessage(data: PostMsg): Promise<this>;
  onDeserialize(data: Buffer): IClientMessage;
  onSerialize(data: IClientMessage): Buffer;
}
