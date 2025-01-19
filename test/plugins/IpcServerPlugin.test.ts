import { describe, expect, it, vi, beforeEach, Mock, afterAll } from "vitest";
import { IpcServerPlugin } from "../../src";
import { uuid } from "../../src/utils/uuid";
import path from "path";
import url from "node:url";
import net from "node:net";
import fs from "node:fs";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDirname = path.resolve(__dirname, "../..");
const pipeFilename = path.join(projectDirname, `./scripts/pipe-${uuid()}.sock`);

const connectOpts = { path: pipeFilename };
const createClientSocket = async (): Promise<net.Socket> => {
  const socket = new net.Socket();
  await new Promise<void>((resolve, reject) => {
    socket.connect(connectOpts, resolve).on("error", reject);
  });
  return socket;
};

describe("IpcServerPlugin", async () => {
  if (fs.existsSync(pipeFilename)) fs.unlinkSync(pipeFilename);

  const serverInstance1 = await new IpcServerPlugin({}).listen(connectOpts);
  const listening = serverInstance1.server.listening;
  it("should start listening successfully", () => {
    expect(listening).toBe(true);
  });
  await serverInstance1.close();

  const connectSpy = vi.fn();
  const disconnectSpy = vi.fn();
  const serverInstance2 = await new IpcServerPlugin({})
    .on("connect", connectSpy)
    .on("disconnect", disconnectSpy)
    .listen(connectOpts);
  const clientSocket = await createClientSocket();
  await sleep(10);
  const connectedClients1 = Array.from(serverInstance2.sockets.keys());
  it("should accept a client connection", () => {
    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(connectedClients1.length).toBe(1);
  });
  await new Promise<void>((resolve) => clientSocket.end(() => resolve()));
  clientSocket.destroy(); // Destroy client socket
  await sleep(10);
  const connectedClients2 = Array.from(serverInstance2.sockets.keys());
  it("should handle client disconnection", () => {
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(connectedClients2.length).toBe(0);
  });
  await serverInstance2.close();

  const clientMessage = Buffer.from("Hello from client");
  const serverMessage = Buffer.from("Hello from server");
  let clientReceived: Buffer;
  let serverReceived: Buffer;
  const serverInstance3 = await new IpcServerPlugin({}).listen(connectOpts);
  const [clientId1, clientSocket1] = await Promise.all([
    new Promise<string>(async (resolve) => {
      serverInstance3.on("connect", resolve).on("data", (id, data) => {
        if (id === clientId1) serverReceived = data;
      });
    }),
    new Promise<net.Socket>(async (resolve) => {
      const socket = await createClientSocket();
      socket.on("data", (data) => void (clientReceived = data));
      resolve(socket);
    }),
  ]);
  await serverInstance3.write(clientId1, serverMessage);
  await new Promise((resolve) => clientSocket1.write(clientMessage, resolve));
  await sleep(10);
  it("should write and receive data from a client", () => {
    expect(clientReceived.toString()).toBe(serverMessage.toString());
    expect(serverReceived.toString()).toBe(clientMessage.toString());
  });
  await serverInstance3.close();

  const server4 = await new IpcServerPlugin({}).listen(connectOpts);
  const clientSocket2 = await createClientSocket();
  await server4.close();
  await sleep(10);
  it("should clean up properly after closing the server", () => {
    expect(server4.server.listening).toBe(false);
    expect(fs.existsSync(pipeFilename)).toBe(false);
  });

  describe("IpcServerPlugin write & read large data", async () => {
    const largeData = Buffer.alloc(10 * 1024 * 1024, "a"); // 10MB buffer

    let serverReceived: Buffer = Buffer.alloc(0);
    let clientReceived: Buffer = Buffer.alloc(0);
    const serverInstance1 = await new IpcServerPlugin({}).listen(connectOpts);
    const [clientId1, clientSocket1] = await Promise.all([
      new Promise<string>(async (resolve) => {
        serverInstance1.on("connect", resolve).on("data", (id, data) => {
          if (id === clientId1)
            serverReceived = Buffer.concat([serverReceived, data]);
        });
      }),
      new Promise<net.Socket>(async (resolve) => {
        const socket = await createClientSocket();
        socket.on("data", (data) => {
          clientReceived = Buffer.concat([clientReceived, data]);
        });
        resolve(socket);
      }),
    ]);

    await serverInstance1.write(clientId1, largeData);
    await new Promise((resolve) => clientSocket1.write(largeData, resolve));
    await sleep(10);
    it("should handle large data writes", () => {
      expect(clientReceived.length).toBe(largeData.length);
      expect(clientReceived.toString()).toBe(largeData.toString());
      expect(serverReceived.length).toBe(largeData.length);
      expect(serverReceived.toString()).toBe(largeData.toString());
    });
    await serverInstance1.close();
  });

  if (fs.existsSync(pipeFilename)) fs.unlinkSync(pipeFilename);
});

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
