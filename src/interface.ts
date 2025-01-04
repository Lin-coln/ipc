export namespace XX {
  // connection
  export type ConnectionState = "disconnected" | "connecting" | "connected";
  export interface Connection<ConnectOpts = any> {
    id: string;
    state: ConnectionState;
    connect(opts: ConnectOpts): Promise<void>;
    write(data: Buffer): boolean;
    disconnect(): void;

    // on(event: "error", handler: (err: Error) => void): this;
    // once(event: "error", handler: (err: Error) => void): this;
    // off(event: "error", handler: (err: Error) => void): this;
    //
    on(event: "close", handler: () => void): this;
    once(event: "close", handler: () => void): this;
    off(event: "close", handler: () => void): this;

    on(event: "connected", handler: () => void): this;
    once(event: "connected", handler: () => void): this;
    off(event: "connected", handler: () => void): this;

    on(event: "data", handler: (data: Buffer) => void): this;
    once(event: "data", handler: (data: Buffer) => void): this;
    off(event: "data", handler: (data: Buffer) => void): this;
  }
  export interface ConnectionManager {
    connections: Map<string, Connection>;

    postMessage(connId: string, data: object): Promise<void>;

    on(event: "disconnected", handler: (connId: string) => void): this;
    once(event: "disconnected", handler: (connId: string) => void): this;
    off(event: "disconnected", handler: (connId: string) => void): this;

    on(event: "connected", handler: (connId: string) => void): this;
    once(event: "connected", handler: (connId: string) => void): this;
    off(event: "connected", handler: (connId: string) => void): this;

    on(event: "message", handler: (connId: string, data: object) => void): this;
    once(
      event: "message",
      handler: (connId: string, data: object) => void,
    ): this;
    off(
      event: "message",
      handler: (connId: string, data: object) => void,
    ): this;
  }

  // peer
  export type RemotePeer = {
    id: string;
    connId: string;
  };
  export type PeerMessage =
    | PeerHandshakeMessage
    | PeerBroadcastMessage
    | PeerDestinationMessage;
  export type PeerHandshakeMessage = {
    type: "peer.handshake";
    peerId: string;
  };
  export type PeerBroadcastMessage = {
    type: "peer.broadcast";
    id: string;
    ttl: number;
    origin: string;
    data: object;
  };

  export type PeerDestinationMessage = {
    type: "peer.destination_message";
    id: string;
    ttl: number;
    origin: string;
    destination: string;
    data: object;
  };
}
