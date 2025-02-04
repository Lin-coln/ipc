import { zigzag } from "./zigzag";

export const varint = {
  encode(value: bigint): Buffer {
    const parts: number[] = [];
    while (value > 127n) {
      parts.push(Number((value & 0x7fn) | 0x80n));
      value >>= 7n;
    }
    parts.push(Number(value));
    return Buffer.from(parts);
  },
  decode(ctx: { buffer: Buffer; offset: number }): bigint {
    let value: bigint = 0n;
    let shift: bigint = 0n;
    let byte: bigint;
    let index: number = ctx.offset;
    do {
      byte = BigInt(ctx.buffer[index++]);
      value |= (byte & 0x7fn) << shift;
      shift += 7n;
    } while (byte >= 128n);
    ctx.offset = index;
    return value;
  },
};

export const svarint = {
  encode(value: bigint): Buffer {
    return varint.encode(zigzag.encode(value));
  },
  decode(ctx: { buffer: Buffer; offset: number }): bigint {
    return zigzag.decode(varint.decode(ctx));
  },
};
