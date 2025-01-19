import net from "node:net";

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
