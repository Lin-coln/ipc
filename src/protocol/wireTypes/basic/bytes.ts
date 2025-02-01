import { DecodeContext, EncodeContext, WireResolver } from "../../interfaces";
import { WireType } from "../../constants";

export const bytes: WireResolver<Buffer> = {
  encode(ctx: EncodeContext, val: Buffer): Buffer {
    return Buffer.concat([
      ctx.sub(val.length, WireType.VarInt).encodeContent(),
      val,
    ]);
  },
  decode(ctx: DecodeContext, buf: Buffer): Buffer {
    const len = ctx.decodeContent<bigint>(WireType.VarInt);
    const start = ctx.offset;
    const end = ctx.offset + Number(len);
    ctx.offset = end;
    return buf.subarray(start, end);
  },
};
