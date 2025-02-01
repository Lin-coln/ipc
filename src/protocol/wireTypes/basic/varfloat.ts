import { DecodeContext, EncodeContext, WireResolver } from "../../interfaces";
import { WireType } from "../../constants";

export const varfloat: WireResolver<number> = {
  encode(ctx: EncodeContext, value: number): Buffer {
    const { exp, int } = parseFloatParams(value);
    return Buffer.concat([
      ctx.sub(exp, WireType.VarInt).encodeContent(),
      ctx.sub(int, WireType.VarInt).encodeContent(),
    ]);
  },
  decode(ctx: DecodeContext): number {
    const exp = ctx.decodeContent<bigint>(WireType.VarInt);
    const int = ctx.decodeContent<bigint>(WireType.VarInt);
    return parseFloatValue(int, exp);
  },
};

export const svarfloat: WireResolver<number> = {
  encode(ctx: EncodeContext, value: number): Buffer {
    const { exp, int } = parseFloatParams(value);
    return Buffer.concat([
      ctx.sub(exp, WireType.VarInt).encodeContent(),
      ctx.sub(int, WireType.SVarInt).encodeContent(),
    ]);
  },
  decode(ctx: DecodeContext): number {
    const exp = ctx.decodeContent<bigint>(WireType.VarInt);
    const int = ctx.decodeContent<bigint>(WireType.SVarInt);
    return parseFloatValue(int, exp);
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
