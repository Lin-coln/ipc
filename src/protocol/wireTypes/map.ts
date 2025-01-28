import type { WireResolver, SupportedType } from "../interfaces";
import { varint } from "./varint";
import { encodeWire, decodeWire } from "../resolver";

export const map: WireResolver<Map<SupportedType, SupportedType>> = {
  encode<K extends SupportedType, V extends SupportedType>(
    val: Map<K, V>,
  ): Buffer {
    const mapEntries = Array.from(val.entries());
    return Buffer.concat([
      varint.encode(BigInt(val.size.toString())),
      ...mapEntries
        .map(([k, v]) => [encodeWire<K>(k), encodeWire<V>(v)])
        .flat(1),
    ]);
  },
  decode<K extends SupportedType, V extends SupportedType>(
    buf: Buffer,
    ofs: number,
  ): {
    value: Map<K, V>;
    offset: number;
  } {
    const map = new Map<K, V>();

    let { value: size, offset: cur } = varint.decode(buf, ofs);
    Array.from({ length: Number(size) }).forEach(() => {
      const key = decodeWire<K>(buf, cur);
      cur = key.offset;
      const val = decodeWire<V>(buf, cur);
      cur = val.offset;
      map.set(key.value, val.value);
    });

    return { value: map, offset: cur };
  },
};
