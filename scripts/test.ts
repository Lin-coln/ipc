import * as ipc from "../dist";
import path from "path";
import url from "node:url";
import * as readline from "node:readline";
import process from "node:process";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDirname = path.resolve(__dirname, "..");
const pipeDirname = path.resolve(projectDirname, "./scripts");
const port = parseInt(process.env.PORT as string, 10) as 5001 | 5002;

const pipeFilename = path.join(pipeDirname, "pipe.sock");
void main();
async function main() {
  if (port === 5001) {
    await executeServer();
  } else if (port === 5002) {
    await executeClient();
  }
}

async function executeServer() {
  let socketId: string;
  const listenOpts = { path: pipeFilename };
  const server = await new ipc.IpcServerPlugin({})
    .on("error", (err) => {
      console.log(`[ipc] error`, "code" in err ? err.code : err.message);
    })
    .on("close", () => {
      console.log(`[ipc] close`);
    })
    .on("listening", () => {
      console.log(`[ipc] listening...`);
    })
    .on("disconnect", ({ id }) => {
      console.log(`[ipc] disconnect`, id);
    })
    .on("connect", (id) => {
      console.log(`[ipc] connect`, id);
      socketId = id;
    })
    .on("data", (id, data) => {
      const raw = data.toString("utf8");
      console.log(`[ipc] ${id} data:`, raw);
    })
    .listen(listenOpts);

  useKeyboard((key) => {
    if (key.ctrl) return;
    if (key.name === "d") {
      console.log(`[press] disconnect`);
      server.disconnect(socketId);
    } else if (key.name === "c") {
      console.log(`[press] close`);
      server.close();
    } else if (key.name === "l") {
      console.log(`[press] listen`);
      server.listen(listenOpts);
    } else if (key.name === "m") {
      console.log(`[press] message`);
      server.write(
        socketId,
        Buffer.from(`${new Date().toISOString()} - hello`, "utf8"),
      );
    }
  });
}

async function executeClient() {
  const connOpts = { path: pipeFilename };
  const client = await new ipc.IpcClientPlugin({})
    .on("error", (err) => {
      console.log(`[ipc] error`, "code" in err ? err.code : err.message);
    })
    .on("connect", async () => {
      await new Promise((resolve) => setTimeout(resolve));
      console.log(`[ipc] connect`, client.remoteIdentifier);
    })
    .on("disconnect", () => {
      console.log(`[ipc] disconnect`);
    })
    .on("data", (data) => {
      const raw = data.toString("utf8");
      console.log(`[ipc] data`, raw);
    })
    .connect(connOpts);

  useKeyboard((key) => {
    if (key.ctrl) return;
    if (key.name === "d") {
      console.log(`[press] disconnect`);
      client.disconnect();
    } else if (key.name === "c") {
      console.log(`[press] connect`);
      client.connect(connOpts);
    } else if (key.name === "m") {
      console.log(`[press] message`);
      const message = `${new Date().toISOString()} - hello`;
      client.write(Buffer.from(message, "utf8"));
    }
  });
}

function useKeyboard(
  callback: (key: { name: string; ctrl: boolean }) => unknown,
) {
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.on(
    "keypress",
    async (str: string, key: { name: string; ctrl: boolean }) => {
      await callback(key);
      if (key.ctrl && key.name === "c") {
        process.exit(0);
      }
    },
  );
}
