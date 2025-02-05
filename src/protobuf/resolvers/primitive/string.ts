import { varint } from "./varint";

export const string = {
  encode(val: string): Buffer {
    const buf = Buffer.from(val, "utf8");
    const len = varint.encode(BigInt(buf.length.toString()));
    return Buffer.concat([len, buf]);
  },
  decode(ctx: { buffer: Buffer; offset: number }): string {
    const len = varint.decode(ctx);
    const start = ctx.offset;
    const end = ctx.offset + Number(len);
    ctx.offset = end;
    return ctx.buffer.subarray(start, end).toString("utf8");
  },
};
