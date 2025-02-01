import type {
  DecodeContext,
  EncodeContext,
  WireResolver,
} from "../../interfaces";

export const boolean: WireResolver<boolean> = {
  encode(ctx: EncodeContext, val: boolean) {
    const buf = Buffer.alloc(1);
    buf.writeUIntBE(val ? 0x1 : 0x0, 0, 1);
    return buf;
  },
  decode(ctx: DecodeContext, buf: Buffer) {
    return buf.readUInt8(ctx.offset++) === 0x01;
  },
};
