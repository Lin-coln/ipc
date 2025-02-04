import { WireType } from "./BasicTypes";
import { SupportedType } from "../interfaces";
import { DecodeContext } from "../decoder";
import {
  array,
  boolean,
  bytes,
  map,
  string,
  svarfloat,
  svarint,
  type_array,
  varfloat,
  varint,
} from "../resolvers";

export class DecodeUtils {
  static decodeWire<T extends SupportedType>(ctx: DecodeContext): T {
    ctx.type = this.decodeType(ctx);
    return this.decodeBody(ctx);
  }

  static decodeType<Type extends WireType>(ctx: DecodeContext): Type {
    return ctx.buffer[ctx.offset++] as Type;
  }

  static decodeBody<T extends SupportedType>(ctx: DecodeContext): T {
    const type: WireType = ctx.type;
    if (type === null) {
      throw new Error(`failed to decode: type not found: ${ctx.type}`);
    }

    let decoded: any;

    if (type === WireType.Boolean) {
      decoded = boolean.decode(ctx) as T;
    } else if (type === WireType.VarInt) {
      decoded = varint.decode(ctx) as T;
    } else if (type === WireType.SVarInt) {
      decoded = svarint.decode(ctx) as T;
    } else if (type === WireType.VarFloat) {
      decoded = varfloat.decode(ctx) as T;
    } else if (type === WireType.SVarFloat) {
      decoded = svarfloat.decode(ctx) as T;
    } else if (type === WireType.Bytes) {
      decoded = bytes.decode(ctx) as T;
    } else if (type === WireType.String) {
      decoded = string.decode(ctx) as T;
    }

    if (type === WireType.Array) {
      decoded = array.decode(ctx, () => this.decodeWire(ctx.sub()));
    } else if (type === WireType.Map) {
      decoded = map.decode(ctx, () => this.decodeWire(ctx.sub()));
    } else if (type === WireType.TypeArray) {
      decoded = type_array.decode(ctx, (type) =>
        this.decodeBody(ctx.sub(type)),
      );
    }

    decoded = postprocessValue(type, decoded);

    return decoded as T;
  }
}

function postprocessValue<T extends SupportedType>(
  type: WireType,
  value: T,
): T {
  // if (typeof value === "bigint") {
  //   if (
  //     value >= BigInt(Number.MIN_SAFE_INTEGER) &&
  //     value <= BigInt(Number.MAX_SAFE_INTEGER)
  //   ) {
  //     return Number(value) as T;
  //   }
  // }

  if (value instanceof Map) {
    return Object.fromEntries(value.entries()) as T;
  }

  return value;
}
