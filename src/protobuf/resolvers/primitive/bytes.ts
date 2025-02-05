import { varint } from "./varint";

export const bytes = {
  encode(val: Buffer): Buffer {
    const len = BigInt(val.length.toString());
    return Buffer.concat([varint.encode(len), val]);
  },
  decode(ctx: { buffer: Buffer; offset: number }): Buffer {
    const len = varint.decode(ctx);
    const start = ctx.offset;
    const end = ctx.offset + Number(len);
    ctx.offset = end;
    return ctx.buffer.subarray(start, end);
  },
};
