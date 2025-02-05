export const boolean = {
  encode(val: boolean): Buffer {
    const buf = Buffer.alloc(1);
    buf.writeUIntBE(val ? 0x1 : 0x0, 0, 1);
    return buf;
  },
  decode(ctx: { buffer: Buffer; offset: number }): boolean {
    return ctx.buffer.readUInt8(ctx.offset++) === 0x01;
  },
};
