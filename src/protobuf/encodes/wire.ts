import { EncodeContext, SupportedTypeOf, WireType } from "../interfaces";
import { EncodeContext as EncodeContextClass } from "./EncodeContext";
import { parseWireTypeFromSupportedValue } from "./parseWireTypeFromSupportedValue";
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

type EncodeWireBody<Type extends WireType> = (
  ctx: EncodeContext<Type>,
  input: SupportedTypeOf<Type>,
) => Buffer;
type WireBodyEncoders = { [Type in WireType]: EncodeWireBody<Type> };

export function encodeWire<Type extends WireType>(
  ctx: EncodeContext<Type>,
  body: SupportedTypeOf<Type>,
): Buffer {
  ctx.wireType ??= parseWireTypeFromSupportedValue(body) as Type;
  return Buffer.concat([encodeType(ctx.wireType), encodeBody(ctx, body)]);
}

export function encodeType<Type extends WireType>(type: Type): Buffer {
  return wire_type.encode(type);
}

export function encodeBody<Type extends WireType>(
  ctx: EncodeContext<Type>,
  val: SupportedTypeOf<Type>,
): Buffer {
  const encoders: WireBodyEncoders = {
    // primitive
    [WireType.Boolean]: (ctx, val) => boolean.encode(val),
    [WireType.VarInt]: (ctx, val) => varint.encode(toBigInt(val)),
    [WireType.SVarInt]: (ctx, val) => svarint.encode(toBigInt(val)),
    [WireType.VarFloat]: (ctx, val) => varfloat.encode(val),
    [WireType.SVarFloat]: (ctx, val) => svarfloat.encode(val),
    [WireType.Bytes]: (ctx, val) => bytes.encode(toBuffer(val)),
    [WireType.String]: (ctx, val) => string.encode(val),

    // collection
    [WireType.Array]: (ctx, val) => {
      return array.encode(toArray(val), (val) => {
        const sub = EncodeContextClass.forSub(ctx, val);
        return encodeWire(sub, val);
      });
    },
    [WireType.Map]: (ctx, val) => {
      return map.encode(toMap(val), (val) => {
        const sub = EncodeContextClass.forSub(ctx, val);
        return encodeWire(sub, val);
      });
    },
    [WireType.TypeArray]: (ctx, val) => {
      const { elType, nested } = ctx.params;
      return type_array.encode(elType, toArray(val), (val) => {
        const sub = EncodeContextClass.forSubType(ctx, elType, nested as any);
        return encodeBody(sub, val);
      });
    },

    // custom
    [WireType.Custom]: () => {
      return Buffer.alloc(0);
    },
  };
  return encoders[ctx.wireType](ctx, val);
}

function toBigInt(
  val: SupportedTypeOf<WireType.VarInt | WireType.SVarInt>,
): bigint {
  return typeof val === "number" ? BigInt(val.toString()) : val;
}

function toBuffer(val: SupportedTypeOf<WireType.Bytes>): Buffer {
  if (Buffer.isBuffer(val)) {
    return val;
  }
  return Buffer.from(val);
}

function toArray<T>(
  val: SupportedTypeOf<WireType.Array | WireType.TypeArray>,
): T[] {
  if (val instanceof Set) {
    return Array.from(val);
  }
  return val;
}

function toMap(val: SupportedTypeOf<WireType.Map>): Map<any, any> {
  // if (Object.prototype.toString.call(val) === "[object Object]") {
  //   return new Map(Object.entries(val));
  // }
  if (val instanceof Map) {
    return val;
  }
  return new Map(Object.entries(val));
}
