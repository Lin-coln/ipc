import net from "node:net";
import { Logger } from "@interfaces/index";
import {
  useArgsMiddleware,
  useRetryMiddleware,
  withMiddleware,
} from "@utils/middleware";
import fixPipeName from "@utils/fixPipeName";
import type { IpcClientPlugin } from "./index";

export function bindSocketLog(socket: net.Socket, logger: Logger) {
  const prefix = "[client.socket]";
  socket
    .on("error", (err) => {
      logger.log(prefix, `error`, "code" in err ? err.code : err.message);
    })
    .on("close", (hadError) => {
      logger.log(prefix, `close`, { hadError });
    })
    .on("data", (data) => {
      logger.log(prefix, `data`, data.toString("utf8"));
    });
}

export async function connect(
  socket: net.Socket,
  connOpts: net.IpcSocketConnectOpts,
) {
  // connected
  if (!socket.connecting && !socket.pending) return;

  let resolve1: () => void;
  let reject1: (err: Error) => void;
  await new Promise<void>((resolve, reject) => {
    resolve1 = resolve;
    reject1 = reject;
    socket.on("error", reject1).on("connect", resolve1).connect(connOpts);
  }).finally(() => {
    socket.off("error", reject1).off("connect", resolve1);
  });
}

// retry feature
export function enhanceConnect<Connect extends IpcClientPlugin["connect"]>(
  connect: Connect,
  logger: Logger,
): Connect {
  return withMiddleware(
    connect,

    // fix pipe name on win32 platform
    useArgsMiddleware(([opts]) => {
      opts.path = fixPipeName(opts.path);
    }),

    // retry feature
    useRetryMiddleware({
      times: 30,
      delay: 1_000,
      onCheck: (err, { cur, max }) => {
        logger.log(
          `[socket] reconnect (${cur}/${max})`,
          "code" in err ? err.code : err.message,
        );
        return (
          "code" in err &&
          ["ENOENT", "ECONNREFUSED"].includes(err.code as string)
        );
      },
    }),
  ) as Connect;
}
