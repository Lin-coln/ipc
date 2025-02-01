import type {
  DecodeContext,
  EncodeContext,
  WireResolver,
} from "../../interfaces";
import { zigzag } from "../utils";

export const varint: WireResolver<bigint> = {
  encode(ctx: EncodeContext, value: bigint): Buffer {
    const parts: number[] = [];
    while (value > 127n) {
      parts.push(Number((value & 0x7fn) | 0x80n));
      value >>= 7n;
    }
    parts.push(Number(value));
    return Buffer.from(parts);
  },
  decode(ctx: DecodeContext, buffer: Buffer): bigint {
    let value: bigint = 0n;
    let shift: bigint = 0n;
    let byte: bigint;
    let index: number = ctx.offset;
    do {
      byte = BigInt(buffer[index++]);
      value |= (byte & 0x7fn) << shift;
      shift += 7n;
    } while (byte >= 128n);
    ctx.offset = index;
    return value;
  },
};

export const svarint: WireResolver<bigint> = {
  encode(ctx: EncodeContext, value: bigint): Buffer {
    return varint.encode(ctx, zigzag.encode(value));
  },
  decode(ctx: DecodeContext, buffer: Buffer): bigint {
    return zigzag.decode(varint.decode(ctx, buffer));
  },
};
