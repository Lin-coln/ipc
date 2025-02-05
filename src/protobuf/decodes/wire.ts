import {
  DecodeContext,
  SupportedType,
  SupportedTypeOf,
  WireType,
} from "../interfaces";
import { DecodeContext as DecodeContextClass } from "./DecodeContext";
import {
  boolean,
  svarfloat,
  svarint,
  varfloat,
  varint,
  bytes,
  string,
  array,
  map,
  type_array,
  wire_type,
} from "../resolvers";

type DecodeWireBody<Type extends WireType> = (
  ctx: DecodeContext<Type>,
) => SupportedTypeOf<Type>;
// type DecodeWireBody<Type extends WireType> = <T extends SupportedTypeOf<Type>>(
//   ctx: DecodeContext<Type>,
// ) => T;
type WireBodyDecoders = { [Type in WireType]: DecodeWireBody<Type> };

export function decodeWire<
  T extends SupportedTypeOf<Type>,
  Type extends WireType,
>(ctx: DecodeContext<Type>): T {
  ctx.wireType = decodeType(ctx);
  return decodeBody(ctx);
}

export function decodeType<Type extends WireType>(
  ctx: DecodeContext<Type>,
): Type {
  return wire_type.decode<Type>(ctx);
}

export function decodeBody<
  T extends SupportedTypeOf<Type>,
  Type extends WireType,
>(ctx: DecodeContext<Type>): T {
  if (ctx.wireType === null) {
    throw new Error(`decoder not found: ${ctx.wireType}`);
  }

  const decoders: WireBodyDecoders = {
    // primitive
    [WireType.Boolean]: (ctx) => boolean.decode(ctx),
    [WireType.VarInt]: (ctx) => varint.decode(ctx),
    [WireType.SVarInt]: (ctx) => svarint.decode(ctx),
    [WireType.VarFloat]: (ctx) => varfloat.decode(ctx),
    [WireType.SVarFloat]: (ctx) => svarfloat.decode(ctx),
    [WireType.Bytes]: (ctx) => bytes.decode(ctx),
    [WireType.String]: (ctx) => string.decode(ctx),

    // collection
    [WireType.Array]: (ctx) =>
      array.decode(ctx, () => decodeWire(DecodeContextClass.forSub(ctx))),
    [WireType.Map]: (ctx) => {
      const sub = DecodeContextClass.forSub(ctx);
      const decoded = map.decode(ctx, () => decodeWire(sub));
      return toObject(decoded);
    },
    [WireType.TypeArray]: (ctx) =>
      type_array.decode(ctx, (type) =>
        decodeBody(DecodeContextClass.forSub(ctx, type)),
      ),

    // custom
    [WireType.Custom]: () => 0 as any,
  };
  return decoders[ctx.wireType](ctx);
}

// if (typeof value === "bigint") {
//   if (
//     value >= BigInt(Number.MIN_SAFE_INTEGER) &&
//     value <= BigInt(Number.MAX_SAFE_INTEGER)
//   ) {
//     return Number(value) as T;
//   }
// }

function toObject(val: SupportedTypeOf<WireType.Map>): {
  [key: number | string]: SupportedType;
} {
  if (val instanceof Map) {
    return Object.fromEntries(val.entries());
  }
  return val;
}
