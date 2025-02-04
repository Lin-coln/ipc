import type { SupportedType } from "../constants";
import { varint } from "./varint";

export const map = {
  encode<K extends SupportedType, V extends SupportedType>(
    val: Map<K, V>,
    onEncode: (val: K | V) => Buffer,
  ): Buffer {
    const mapEntries = Array.from(val.entries());
    const size = varint.encode(BigInt(val.size.toString()));
    return Buffer.concat([
      size,
      ...mapEntries.map(([k, v]) => [onEncode(k), onEncode(v)]).flat(1),
    ]);
  },
  decode<K extends SupportedType, V extends SupportedType>(
    ctx: { buffer: Buffer; offset: number },
    onDecode: <T extends SupportedType>() => T,
  ): Map<K, V> {
    const size = varint.decode(ctx);
    return new Map<K, V>(
      Array.from<any, [K, V]>({ length: Number(size) }, (_) => [
        onDecode<K>(),
        onDecode<V>(),
      ]),
    );
  },
};
