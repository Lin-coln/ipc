import type { SupportedType, WireType } from "../../interfaces";
import { varint } from "../primitive/varint";
import { wire_type } from "../wire_type";

export const type_array = {
  encode<T extends SupportedType>(
    type: WireType,
    val: T[],
    onEncode: (val: T) => Buffer,
  ): Buffer {
    const len = varint.encode(BigInt(val.length.toString()));
    return Buffer.concat([
      len,
      wire_type.encode(type),
      ...val.values().map((val) => onEncode(val)),
    ]);
  },
  decode<T extends SupportedType>(
    ctx: {
      buffer: Buffer;
      offset: number;
    },
    onDecode: (type: WireType) => T,
  ): T[] {
    const len = varint.decode(ctx);
    const type = wire_type.decode(ctx);
    return Array.from<any, T>({ length: Number(len) }, (_) => onDecode(type));
  },
};
