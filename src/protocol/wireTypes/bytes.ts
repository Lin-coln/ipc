import type { WireResolver } from "../interfaces";
import { varint } from "./varint";

export const bytes: WireResolver<Buffer> = {
  encode(val: Buffer): Buffer {
    return Buffer.concat([varint.encode(BigInt(val.length.toString())), val]);
  },
  decode(buf: Buffer, ofs: number): { value: Buffer; offset: number } {
    const { value: len, offset: ofs1 } = varint.decode(buf, ofs);
    const ofs2 = ofs1 + Number(len);
    return {
      value: buf.subarray(ofs1, ofs2),
      offset: ofs2,
    };
  },
};
