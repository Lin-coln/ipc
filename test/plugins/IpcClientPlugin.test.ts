import { describe, expect, it, vi } from "vitest";
import { IpcClientPlugin } from "../../src";
import path from "path";
import url from "node:url";
import net from "node:net";
import fs from "node:fs";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDirname = path.resolve(__dirname, "../..");
const pipeFilename = path.join(projectDirname, "./scripts/pipe.sock");

describe("IpcClientPlugin", () => {
  it("should ", () => {
    expect(0).toBe(0);
  });
});

// describe("general", async () => {
//   const server = net.createServer();
//   await new Promise<void>((resolve) => {
//     server.listen({ path: pipeFilename }, () => resolve());
//   });
//
//   if (fs.existsSync(pipeFilename)) fs.unlinkSync(pipeFilename);
//   const handleConnect = vi.fn();
//   const connOpts = { path: pipeFilename };
//   const client = new IpcClientPlugin({}).once("connect", handleConnect);
//   await client.connect(connOpts);
//
//   it("1. should be connected", () => {
//     expect(handleConnect).toHaveBeenCalledTimes(1);
//   });
// });
