import { svarint, varint } from "./varint";
import type { WireResolver } from "../interfaces";

export const varfloat: WireResolver<number> = {
  encode(value: number): Buffer {
    const { exp, int } = parseFloatParams(value);
    return Buffer.concat([
      varint.encode(BigInt(exp.toString())),
      varint.encode(BigInt(int.toString())),
    ]);
  },
  decode(buffer: Buffer, offset: number): { value: number; offset: number } {
    const { value: exp, offset: ofs1 } = varint.decode(buffer, offset);
    const { value: int, offset: ofs2 } = varint.decode(buffer, ofs1);
    return {
      value: parseFloatValue(int, exp),
      offset: ofs2,
    };
  },
};

export const svarfloat: WireResolver<number> = {
  encode(value: number): Buffer {
    const { exp, int } = parseFloatParams(value);
    return Buffer.concat([
      varint.encode(BigInt(exp.toString())),
      svarint.encode(BigInt(int.toString())),
    ]);
  },
  decode(buffer: Buffer, offset: number): { value: number; offset: number } {
    const { value: exp, offset: ofs1 } = varint.decode(buffer, offset);
    const { value: int, offset: ofs2 } = svarint.decode(buffer, ofs1);
    return {
      value: parseFloatValue(int, exp),
      offset: ofs2,
    };
  },
};

function parseFloatParams(value: number) {
  const str: string = value.toString();
  const idx = str.indexOf(".");
  const exp = idx === -1 ? 0 : str.length - (idx + 1);
  const int = Math.floor(value * 10 ** exp);
  return {
    exp,
    int,
  };
}

function parseFloatValue(int: bigint, exp: bigint): number {
  const num = Number(int) * 10 ** Number(-exp);
  return parseFloat(num.toPrecision(int.toString().length));
}
