import { Peer } from "../dist";
import path from "path";
import url from "node:url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const projectDirname = path.resolve(__dirname, "..");

const pipeDirname = path.resolve(projectDirname, "./scripts");
const port: number = parseInt(process.env.PORT as string, 10);

void main();

async function main() {
  const ports = {
    "5001": [5002],
    "5002": [5001],
    "5003": [],
  };

  console.log(`[peer] ${port}`);

  const peer = new Peer()
    .on("connected", (connId) => {
      // console.log("[peer] connected", connId);
      // void connManager.postMessage(connId, { message: `hello from ${connId}` });
    })
    .on("message", (connId, data) => {
      // console.log("[peer] received message", connId, data);
    })
    .on("peer.broadcast", (data) => {
      console.log(`[peer] broadcast`, data);
    });

  await peer.listen({
    path: path.join(pipeDirname, `pipe-${port}.sock`),
    // host: "localhost", port: port
  });

  const list = ports[port.toString()] as number[];
  for (const remotePort of list) {
    await peer.connect({
      path: path.join(pipeDirname, `pipe-${remotePort}.sock`),
      // host: "localhost", port: remotePort
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 2_000));
  await peer.broadcast({
    id: peer.id,
  });

  // if (port === 5001) {
  //   await peer.connect({
  //     host: "localhost",
  //     port: 5002,
  //   });
  // } else {
  //   await peer.listen({ host: "localhost", port: port });
  // }
}
