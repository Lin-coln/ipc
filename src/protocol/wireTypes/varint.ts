import type { WireResolver } from "../interfaces";
import { zigzag } from "./utils";

export const varint: WireResolver<bigint> = {
  encode(value: bigint): Buffer {
    const parts: number[] = [];
    while (value > 127n) {
      parts.push(Number((value & 0x7fn) | 0x80n));
      value >>= 7n;
    }
    parts.push(Number(value));
    return Buffer.from(parts);
  },
  decode(
    buffer: Buffer,
    offset: number,
  ): {
    value: bigint;
    offset: number;
  } {
    let value: bigint = 0n;
    let shift: bigint = 0n;
    let byte: bigint;
    let index: number = offset;
    do {
      byte = BigInt(buffer[index++]);
      value |= (byte & 0x7fn) << shift;
      shift += 7n;
    } while (byte >= 128n);
    return {
      value,
      offset: index,
    };
  },
};

export const svarint: WireResolver<bigint> = {
  encode(value: bigint): Buffer {
    return varint.encode(zigzag.encode(value));
  },
  decode(buffer: Buffer, offset: number): { value: bigint; offset: number } {
    const { value: encoded, offset: ofs } = varint.decode(buffer, offset);
    return {
      value: zigzag.decode(encoded),
      offset: ofs,
    };
  },
};
