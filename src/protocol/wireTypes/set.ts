import type { WireResolver, SupportedType } from "../interfaces";
import { varint } from "./varint";
import { encodeWire, decodeWire } from "../resolver";

export const set: WireResolver<Set<any>> = {
  encode<T extends SupportedType>(val: Set<T>): Buffer {
    return Buffer.concat([
      varint.encode(BigInt(val.size.toString())),
      ...val.values().map((val) => encodeWire<T>(val)),
    ]);
  },
  decode<T extends SupportedType>(
    buf: Buffer,
    ofs: number,
  ): { value: Set<T>; offset: number } {
    const set = new Set<T>();
    let { value: size, offset: cur } = varint.decode(buf, ofs);
    Array.from({ length: Number(size) }).forEach(() => {
      const res = decodeWire<T>(buf, cur);
      set.add(res.value);
      cur = res.offset;
    });
    return { value: set, offset: cur };
  },
};
