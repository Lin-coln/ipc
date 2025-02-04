import { SupportedType, WireType } from "./index";
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
  wire_type,
} from "../resolvers";
import { TypeArrParams } from "../interfaces";
import { EncodeContext } from "../encoder";

export class EncodeUtils {
  static encodeWire<T extends SupportedType>(
    ctx: EncodeContext,
    body: T,
  ): Buffer {
    ctx.type ??= this.parseWireTypeFromSupportedValue(body);
    return Buffer.concat([
      this.encodeType(ctx.type), // wire type
      this.encodeBody(ctx, body),
    ]);
  }

  static encodeType<Type extends WireType>(type: Type): Buffer {
    return wire_type.encode(type);
  }

  static encodeBody<T extends SupportedType>(
    ctx: EncodeContext,
    body: T,
  ): Buffer {
    const type = ctx.type;
    if (type === null) {
      throw new Error(`failed to encode: type not found: ${ctx.type}`);
    }

    const value = preprocessValue(type, body);
    if (type === WireType.Boolean) {
      return boolean.encode(value as boolean);
    } else if (type === WireType.VarInt) {
      return varint.encode(value as bigint);
    } else if (type === WireType.SVarInt) {
      return svarint.encode(value as bigint);
    } else if (type === WireType.VarFloat) {
      return varfloat.encode(value as number);
    } else if (type === WireType.SVarFloat) {
      return svarfloat.encode(value as number);
    } else if (type === WireType.Bytes) {
      return bytes.encode(value as Buffer);
    } else if (type === WireType.String) {
      return string.encode(value as string);
    }

    if (type === WireType.Array) {
      return array.encode(value as any, (val) =>
        this.encodeWire(new EncodeContext(val), val),
      );
    } else if (type === WireType.Map) {
      return map.encode(value as any, (val) =>
        this.encodeWire(new EncodeContext(val), val),
      );
    } else if (type === WireType.TypeArray) {
      const { type: elType, nested } = ctx.params as TypeArrParams;
      return type_array.encode(elType, value as any, (val) => {
        const ctx = new EncodeContext().setType(elType, nested ?? null);
        return this.encodeBody(ctx, val);
      });
    }

    throw new Error(`failed to encode: ${type}`);
  }

  static parseWireTypeFromSupportedValue<T extends SupportedType>(
    value: T,
  ): WireType {
    let type: WireType | null = null;

    if (typeof value === "boolean") {
      type = WireType.Boolean;
    } else if (typeof value === "string") {
      type = WireType.String;
    } else if (typeof value === "bigint") {
      type = value < 0 ? WireType.SVarInt : WireType.VarInt;
    } else if (typeof value === "number") {
      const isFloat = value % 1 !== 0;
      if (isFloat) {
        type = value < 0 ? WireType.SVarFloat : WireType.VarFloat;
      } else {
        type = value < 0 ? WireType.SVarInt : WireType.VarInt;
      }
    } else if (value instanceof ArrayBuffer || Buffer.isBuffer(value)) {
      type = WireType.Bytes;
    } else if (value && typeof value === "object") {
      if (value instanceof Set) {
        type = WireType.Array;
      } else if (value instanceof Map) {
        type = WireType.Map;
      } else if (Array.isArray(value)) {
        type = WireType.Array;
      } else if (Object.prototype.toString.call(value) === "[object Object]") {
        type = WireType.Map;
      }
    }

    if (type === null) {
      throw new Error("Unsupported type");
    }

    return type;
  }
}

function preprocessValue<T extends SupportedType>(type: WireType, value: T): T {
  if (typeof value === "number") {
    if ([WireType.VarInt, WireType.SVarInt].includes(type)) {
      return BigInt((value as number).toString()) as T;
    }
  }

  if (value && typeof value === "object") {
    if (value instanceof Set) {
      if ([WireType.Array, WireType.TypeArray].includes(type)) {
        return Array.from(value) as T;
      }
    }

    if (Object.prototype.toString.call(value) === "[object Object]") {
      if ([WireType.Map].includes(type)) {
        return new Map(Object.entries(value)) as T;
      }
    }
  }

  return value;
}
