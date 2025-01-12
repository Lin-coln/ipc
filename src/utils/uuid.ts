import * as crypto from "node:crypto";

export const uuid = (() => {
  let gid = 0;
  return () =>
    crypto
      .createHash("md5")
      .update((Math.round(Math.random() * 1024) + gid++).toString(), "utf-8")
      .digest("hex")
      .toString()
      .slice(0, 6);
})();
