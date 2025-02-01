import { DecodeContext, EncodeContext, WireResolver } from "../../interfaces";
import { WireType } from "../../constants";

export const string: WireResolver<string> = {
  encode(ctx: EncodeContext, val: string): Buffer {
    const buf = Buffer.from(val, "utf8");
    return Buffer.concat([
      ctx.sub(buf.length, WireType.VarInt).encodeContent(),
      buf,
    ]);
  },
  decode(ctx: DecodeContext, buf: Buffer): string {
    const len = ctx.decodeContent<bigint>(WireType.VarInt);
    const start = ctx.offset;
    const end = ctx.offset + Number(len);
    ctx.offset = end;
    return buf.subarray(start, end).toString("utf8");
  },
};
