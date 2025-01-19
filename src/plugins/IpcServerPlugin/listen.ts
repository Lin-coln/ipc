import net from "node:net";
import fixPipeName from "@utils/fixPipeName";
import process from "node:process";
import fs from "node:fs";
import useCleanup from "@utils/useCleanup";
import { IpcServerPlugin } from "./index";

export async function listen(
  server: net.Server,
  listenOpts: net.ListenOptions,
) {
  if (server.listening) return;

  let resolve1: () => void;
  let reject1: (err: Error) => void;
  await new Promise<void>((resolve, reject) => {
    resolve1 = resolve;
    reject1 = reject;
    server.on("error", reject1).on("listening", resolve1).listen(listenOpts);
  }).finally(() => {
    server.off("error", reject1).off("listening", resolve1);
  });
}

export function enhanceListen(this: IpcServerPlugin) {
  const listen = this.listen;
  this.listen = function (this: IpcServerPlugin, opts: net.ListenOptions) {
    let sockPath = opts.path;
    if (!sockPath) return listen.call(this, opts);

    sockPath = fixPipeName(sockPath);

    // wrap clear sock file
    const clearSock = () =>
      process.platform !== "win32" &&
      fs.existsSync(sockPath) &&
      fs.unlinkSync(sockPath);
    return listen
      .call(this, { ...opts, path: sockPath })
      .then((res) => {
        useCleanup(clearSock);
        return res;
      })
      .catch((e) => {
        clearSock();
        throw e;
      });
  };
}
