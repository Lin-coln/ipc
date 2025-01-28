import type { WireResolver } from "../interfaces";
import { varint } from "./varint";

export const string: WireResolver<string> = {
  encode(val: string): Buffer {
    return Buffer.concat([
      varint.encode(BigInt(val.length.toString())),
      Buffer.from(val, "utf8"),
    ]);
  },
  decode(buf: Buffer, ofs: number): { value: string; offset: number } {
    const { value: len, offset: ofs1 } = varint.decode(buf, ofs);
    const ofs2 = ofs1 + Number(len);
    return {
      value: buf.subarray(ofs1, ofs2).toString("utf8"),
      offset: ofs2,
    };
  },
};
