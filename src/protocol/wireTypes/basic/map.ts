import {
  DecodeContext,
  EncodeContext,
  SupportedType,
  WireResolver,
} from "../../interfaces";
import { WireType } from "../../constants";

export const map: WireResolver<Map<SupportedType, SupportedType>> = {
  encode<K extends SupportedType, V extends SupportedType>(
    ctx: EncodeContext,
    val: Map<K, V>,
  ): Buffer {
    const mapEntries = Array.from(val.entries());
    return Buffer.concat([
      ctx.sub(val.size, WireType.VarInt).encodeContent(),
      ...mapEntries
        .map(([k, v]) => [ctx.sub(k).encode(), ctx.sub(v).encode()])
        .flat(1),
    ]);
  },
  decode<K extends SupportedType, V extends SupportedType>(
    ctx: DecodeContext,
    buf: Buffer,
  ): Map<K, V> {
    const map = new Map<K, V>();
    const size = ctx.decodeContent<bigint>(WireType.VarInt);
    Array.from({ length: Number(size) }).forEach(() => {
      const key = ctx.decode<K>();
      const val = ctx.decode<V>();
      map.set(key, val);
    });
    return map;
  },
};
