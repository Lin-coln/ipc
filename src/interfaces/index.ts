import EventBus from "../utils/EventBus";

export interface Logger {
  log: (...args: any[]) => void;
}

export interface ClientEvents {
  error(err: Error): void;
  disconnect(): void;
  connect(): void;
  data(data: Buffer): void;
}

export interface ClientPlugin<ConnOpts> extends EventBus<ClientEvents> {
  readonly remoteIdentifier: string | null;
  connect(opts: ConnOpts): Promise<this>;
  disconnect(err?: Error): Promise<void>;
  write(data: Buffer): boolean;
}

export interface ServerEvents {
  error(err: Error): void;
  close(): void;
  listening(): void;
  data(data: Buffer, ctx: { id: string; reply: (data: Buffer) => void }): void;
}

export interface ServerPlugin<ListenOpts> extends EventBus<ServerEvents> {
  listen(opts: ListenOpts): Promise<this>;
  close(): Promise<void>;
  write(id: string, data: Buffer): boolean;
}
