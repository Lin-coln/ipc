import { describe, expect, it, vi, beforeEach, Mock, afterAll } from "vitest";
import { IpcClientPlugin } from "../../src";
import path from "path";
import url from "node:url";
import net from "node:net";
import fs from "node:fs";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDirname = path.resolve(__dirname, "../..");
const pipeFilename = path.join(projectDirname, "./scripts/pipe.sock");

const connectOpts = { path: pipeFilename };
const server = getSocketServer();

describe("IpcClientPlugin basic functionality", async () => {
  await server.open(connectOpts);
  const ipcClient = new IpcClientPlugin({});

  const mockOnConnect1 = vi.fn();
  const result = await ipcClient
    .on("connect", mockOnConnect1)
    .connect(connectOpts);
  ipcClient.off("connect", mockOnConnect1);
  it("should connect successfully", () => {
    expect(result).toBe(ipcClient);
    expect(mockOnConnect1).toHaveBeenCalledTimes(1);
  });

  const identifier = ipcClient.remoteIdentifier;
  it("should remoteIdentifier existed", () => {
    expect(identifier).toBeTypeOf("string");
  });

  const mockOnData1 = vi.fn();
  const message1 = "message from client";
  await ipcClient.on("data", mockOnData1).write(Buffer.from(message1, "utf8"));
  await sleep(10);
  ipcClient.off("data", mockOnData1);
  it("should send & receive data", () => {
    expect(mockOnData1).toHaveBeenCalledWith(Buffer.from(message1, "utf8"));
    expect(mockOnData1).toHaveBeenCalledTimes(1);
  });

  const mockOnDisconnect1 = vi.fn();
  await ipcClient.on("disconnect", mockOnDisconnect1).disconnect();
  ipcClient.off("disconnect", mockOnDisconnect1);
  it("should disconnect successfully", () => {
    expect(mockOnDisconnect1).toHaveBeenCalledWith({
      identifier,
      passive: false,
    });
    expect(mockOnDisconnect1).toHaveBeenCalledTimes(1);
  });

  const mockOnConnect2 = vi.fn();
  await server.close();
  await Promise.allSettled([
    ipcClient.on("connect", mockOnConnect2).connect(connectOpts),
    server.open(connectOpts),
  ]);
  ipcClient.off("connect", mockOnConnect2);
  it("should reconnect successfully", () => {
    expect(result).toBe(ipcClient);
    expect(mockOnConnect2).toHaveBeenCalledTimes(1);
  });

  const mockOnDisconnect2 = vi.fn();
  ipcClient.on("disconnect", mockOnDisconnect2);
  server.disconnect();
  await sleep(10);
  ipcClient.off("disconnect", mockOnDisconnect2);
  it("should disconnect event when server close socket", () => {
    expect(mockOnDisconnect2).toHaveBeenCalledWith({
      identifier,
      passive: true,
    });
    expect(mockOnDisconnect2).toHaveBeenCalledTimes(1);
  });

  await ipcClient.disconnect();
  await server.close();
});

describe("IpcClientPlugin repeat actions", async () => {
  await server.open(connectOpts);
  const ipcClient = new IpcClientPlugin({});

  const mockOnConnect1 = vi.fn();
  ipcClient.on("connect", mockOnConnect1);
  void ipcClient.connect(connectOpts);
  void ipcClient.connect(connectOpts);
  await ipcClient.connect(connectOpts);
  ipcClient.off("connect", mockOnConnect1);
  it("should handle repeated connect attempts without error", () => {
    expect(mockOnConnect1).toHaveBeenCalledTimes(1);
  });

  const mockOnDisconnect1 = vi.fn();
  ipcClient.on("disconnect", mockOnDisconnect1);
  void ipcClient.disconnect();
  void ipcClient.disconnect();
  await ipcClient.disconnect();
  ipcClient.off("disconnect", mockOnDisconnect1);
  it("should handle repeated disconnect attempts without error", () => {
    expect(mockOnDisconnect1).toHaveBeenCalledTimes(1);
  });

  await ipcClient.disconnect();
  await server.close();
});

describe("IpcClientPlugin write large data", async () => {
  await server.open(connectOpts);
  const ipcClient = new IpcClientPlugin({});

  let received = Buffer.alloc(0);
  await ipcClient
    .on("data", (data) => {
      received = Buffer.concat([received, data]);
    })
    .connect(connectOpts);

  const writableHighWaterMark = ipcClient.socket.writableHighWaterMark;
  const origin = Buffer.from(
    Array.from({ length: writableHighWaterMark / 2 }, (_, i) => i + 1).join(
      ",",
    ),
    "utf8",
  );
  await ipcClient.write(origin);
  await sleep(100);

  it("should send & received large binary data successfully", () => {
    expect(received.length).toBe(origin.length);
    expect(received.toString()).toBe(origin.toString());
  });

  await ipcClient.disconnect();
  await server.close();
});

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function getSocketServer() {
  let pipeFilename: string | undefined;
  let socket: net.Socket;
  const server = net.createServer((client) => {
    socket = client;
    client.on("data", (data: Buffer) => {
      client.write(data);
    });
  });
  return {
    open,
    close,
    disconnect() {
      socket.destroy();
    },
    get socket() {
      return socket;
    },
  };
  async function open(listenOpts: net.ListenOptions) {
    pipeFilename = listenOpts.path;
    if (pipeFilename && fs.existsSync(pipeFilename))
      fs.unlinkSync(pipeFilename);
    await new Promise<void>((resolve) => {
      server.listen(listenOpts, () => resolve());
    });
  }
  async function close() {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (pipeFilename && fs.existsSync(pipeFilename))
      fs.unlinkSync(pipeFilename);
  }
}
