import {
  DecodeContext,
  SupportedType,
  TypeArrEncodeContext,
  WireResolver,
} from "../../interfaces";
import { WireType } from "../../constants";

export const type_arr: WireResolver<any[]> = {
  encode<T extends SupportedType>(ctx: TypeArrEncodeContext, val: T[]): Buffer {
    const type = ctx.getParams().type;
    return Buffer.concat([
      ctx.sub(val.length, WireType.VarInt).encodeContent(),
      ctx.encodeType(type),
      ...val.values().map((val) => ctx.sub(val, type).encodeContent()),
    ]);
  },
  decode<T extends SupportedType>(ctx: DecodeContext, buf: Buffer): T[] {
    const arr: T[] = [];
    const len = ctx.decodeContent<bigint>(WireType.VarInt);
    const type = ctx.decodeType();
    Array.from({ length: Number(len) }).forEach(() => {
      arr.push(ctx.decodeContent(type));
    });
    return arr;
  },
};
