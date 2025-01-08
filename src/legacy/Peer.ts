import { ConnectionManager } from "./Connection";
import { uuid } from "./utils";
import { XX } from "./interface";

export class Peer extends ConnectionManager {
  id: string;
  peers: Map<string, XX.RemotePeer>;
  receivedMessages: Set<string>;

  constructor() {
    super();
    this.id = uuid();
    this.peers = new Map();
    this.receivedMessages = new Set();

    console.log(`[peer] ${this.id}`);

    this
      // handler
      .on("disconnect", (connId) => {
        console.log(`[peer] conn disconnected ${connId}`);
        const peer = this.peers.values().find((x) => x.connId === connId);
        if (peer) this.peers.delete(peer.id);
      })
      .on("connected", (connId: string) => {
        console.log(`[peer] conn connected ${connId}`);
        void this.postMessage(connId, {
          type: "peer.handshake",
          peerId: this.id,
        });
      })
      .on("message", (connId: string, msg: XX.PeerMessage) => {
        if (msg.type === "peer.handshake") {
          handleHandshake.call(this, msg, connId);
        } else if (msg.type === "peer.broadcast") {
          handleBroadcast.call(this, msg);
        } else if (msg.type === "peer.destination_message") {
          handleDestinationMessage.call(this, msg);
        } else {
          console.log("[peer] message received", msg);
        }
      });
  }

  async broadcast(
    data: object,
    extra?: Omit<XX.PeerBroadcastMessage, "type" | "data">,
  ) {
    const opts: Omit<XX.PeerBroadcastMessage, "type" | "data"> = Object.assign(
      {
        id: uuid(),
        ttl: 1_000,
        origin: this.id,
      },
      extra ?? {},
    );

    if (opts.ttl <= 0) return;
    if (this.receivedMessages.has(opts.id)) return;
    this.receivedMessages.add(opts.id);

    const message: XX.PeerBroadcastMessage = {
      type: "peer.broadcast",
      data,
      ...opts,
    };

    await this.batchPeers((remotePeer) => {
      if (remotePeer.id === message.origin) return;
      return this.postMessage(remotePeer.connId, message).catch(() => void 0);
    });
  }

  async postDestinationMessage(
    dest: string,
    data: object,
    extra?: Omit<XX.PeerDestinationMessage, "type" | "data" | "destination">,
  ) {
    const opts: Omit<
      XX.PeerDestinationMessage,
      "type" | "data" | "destination"
    > = Object.assign(
      {
        id: uuid(),
        ttl: 10,
        origin: this.id,
      },
      extra ?? {},
    );

    if (dest === this.id) return;
    if (opts.ttl <= 0) return;
    if (this.receivedMessages.has(opts.id)) return;
    this.receivedMessages.add(opts.id);

    const message: XX.PeerDestinationMessage = {
      type: "peer.destination_message",
      data,
      destination: dest,
      ...opts,
    };

    await this.batchPeers((remotePeer) => {
      if (remotePeer.id === message.origin) return;
      return this.postMessage(remotePeer.connId, message).catch(() => void 0);
    });
  }

  private async batchPeers(
    handler: (remotePeer: XX.RemotePeer) => unknown,
    opts: { batchSize?: number } = {},
  ) {
    const batchSize = opts.batchSize ?? 16;

    const peerIdList = Array.from(this.peers.keys());
    await Promise.all(
      Array.from(
        { length: batchSize },
        (_, i) =>
          new Promise<void>(async (resolve, reject) => {
            try {
              while (true) {
                const remotePeerId = peerIdList.shift();
                if (!remotePeerId) break;
                const remotePeer = this.peers.get(remotePeerId);
                if (!remotePeer) break;
                await handler(remotePeer);
              }
              resolve();
            } catch (e) {
              reject(e);
            }
          }),
      ),
    );
  }
}

function handleHandshake(
  this: Peer,
  msg: XX.PeerHandshakeMessage,
  connId: string,
) {
  const { peerId } = msg;
  console.log(`[peer] remotePeer ${peerId}`);
  if (!this.peers.has(peerId)) {
    this.peers.set(peerId, { id: peerId, connId: connId });
  } else {
    const remotePeer = this.peers.get(peerId)!;
    remotePeer.connId = connId;
  }
}

function handleBroadcast(this: Peer, msg: XX.PeerBroadcastMessage) {
  const { type, data, ...rest } = msg;
  if (msg.origin === this.id) return;
  void this.broadcast(data, { ...rest, ttl: rest.ttl - 1 });
  this.emit("peer.broadcast", data);
}

function handleDestinationMessage(this: Peer, msg: XX.PeerDestinationMessage) {
  const { type, destination, data, ...rest } = msg;
  if (msg.origin === this.id) return;
  if (destination !== this.id) {
    void this.postDestinationMessage(destination, data, rest);
  } else {
    this.emit("peer.destination_message", data);
  }
}
