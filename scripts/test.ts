import * as ipc from "../dist";
import path from "path";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDirname = path.resolve(__dirname, "..");
const pipeDirname = path.resolve(projectDirname, "./scripts");
const port = parseInt(process.env.PORT as string, 10) as 5001 | 5002;

void main();

async function main() {
  const pipeFilename = path.join(pipeDirname, "pipe.sock");
  if (port === 5001) {
    const server = await new ipc.IpcServerPlugin({}).listen({
      path: pipeFilename,
    });
  } else {
    const client = await new ipc.IpcConnPlugin({})
      .on("connect", async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        console.log("id", client.remoteIdentifier);
        console.log(client.socket);
      })
      .connect({ path: pipeFilename });

    await new Promise((resolve) => setTimeout(resolve, 4_000));

    client.write(Buffer.from(`${new Date().toISOString()} - hello`, "utf8"));
  }
}
