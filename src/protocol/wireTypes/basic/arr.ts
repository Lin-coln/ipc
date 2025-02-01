import {
  DecodeContext,
  EncodeContext,
  SupportedType,
  WireResolver,
} from "../../interfaces";
import { WireType } from "../../constants";

export const arr: WireResolver<any[]> = {
  encode<T extends SupportedType>(ctx: EncodeContext, val: T[]): Buffer {
    return Buffer.concat([
      ctx.sub(val.length, WireType.VarInt).encodeContent(),
      ...val.values().map((val) => ctx.sub(val).encode()),
    ]);
  },
  decode<T extends SupportedType>(ctx: DecodeContext, buf: Buffer): T[] {
    const arr: T[] = [];
    const len = ctx.decodeContent<bigint>(WireType.VarInt);
    Array.from({ length: Number(len) }).forEach(() => {
      arr.push(ctx.decode<T>());
    });
    return arr;
  },
};
