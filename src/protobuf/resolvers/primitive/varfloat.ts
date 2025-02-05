import { svarint, varint } from "./varint";

export const varfloat = {
  encode(value: number): Buffer {
    const { exp, int } = parseFloatParams(value);
    return Buffer.concat([
      varint.encode(BigInt(exp.toString())),
      varint.encode(BigInt(int.toString())),
    ]);
  },
  decode(ctx: { buffer: Buffer; offset: number }): number {
    const exp = varint.decode(ctx);
    const int = varint.decode(ctx);
    return parseFloatValue(int, exp);
  },
};

export const svarfloat = {
  encode(value: number): Buffer {
    const { exp, int } = parseFloatParams(value);
    return Buffer.concat([
      varint.encode(BigInt(exp.toString())),
      svarint.encode(BigInt(int.toString())),
    ]);
  },
  decode(ctx: { buffer: Buffer; offset: number }): number {
    const exp = varint.decode(ctx);
    const int = svarint.decode(ctx);
    return parseFloatValue(int, exp);
  },
};

function parseFloatParams(value: number): { exp: number; int: number } {
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
