import type { SupportedType } from "../../interfaces";
import { varint } from "../primitive/varint";

export const array = {
  encode<T extends SupportedType>(
    val: T[],
    onEncode: (val: T) => Buffer,
  ): Buffer {
    const len = varint.encode(BigInt(val.length.toString()));
    return Buffer.concat([len, ...val.values().map(onEncode)]);
  },
  decode<T extends SupportedType>(
    ctx: { buffer: Buffer; offset: number },
    onDecode: () => T,
  ): T[] {
    const len = varint.decode(ctx);
    return Array.from<any, T>({ length: Number(len) }, (_): T => onDecode());
  },
};
