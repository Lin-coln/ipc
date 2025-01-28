import type { SupportedType } from "./interfaces";
import { getWireResolver, WireType } from "./interfaces/constants";

export function encodeWire<T extends SupportedType>(value: T): Buffer {
  const type = resolveWireTypeFromSupportedValue<T>(value);
  return Buffer.concat([
    encodeType(type), // type
    encodeContent(value, type), // content
  ]);
}

export function decodeWire<T extends SupportedType>(
  buffer: Buffer,
  offset: number,
): { value: T; offset: number } {
  const { value: type, offset: ofs } = decodeType(buffer, offset);
  return decodeContent(buffer, ofs, type);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function encodeType(type: WireType): Buffer {
  return Buffer.from([type]);
}

export function decodeType<Type extends WireType>(
  buf: Buffer,
  ofs: number,
): { value: Type; offset: number } {
  const type = (buf[ofs++] & 0b0000_1111) as Type;
  return { value: type, offset: ofs };
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function encodeContent<T extends SupportedType>(
  value: T,
  type: WireType,
): Buffer {
  const resolver = getWireResolver<T>(type);

  if (type === WireType.VarInt || type === WireType.SVarInt) {
    value =
      typeof value === "bigint"
        ? value
        : (BigInt((value as number).toString()) as T);
  }

  return resolver.encode(value);
}

export function decodeContent<T extends SupportedType>(
  buffer: Buffer,
  offset: number,
  type: WireType,
): { value: T; offset: number } {
  const resolver = getWireResolver<T>(type);
  return resolver.decode(buffer, offset);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function resolveWireTypeFromSupportedValue<T extends SupportedType>(
  value: T,
): WireType {
  if (typeof value === "boolean") {
    return WireType.Boolean;
  }

  if (typeof value === "bigint") {
    return value < 0 ? WireType.SVarInt : WireType.VarInt;
  }

  if (typeof value === "number") {
    const isFloat = value % 1 !== 0;
    if (isFloat) {
      return value < 0 ? WireType.SVarFloat : WireType.VarFloat;
    } else {
      return value < 0 ? WireType.SVarInt : WireType.VarInt;
    }
  }

  if (typeof value === "string") {
    return WireType.String;
  }

  if (value instanceof ArrayBuffer || Buffer.isBuffer(value)) {
    return WireType.Bytes;
  }

  if (typeof value === "object") {
    if (value instanceof Set || Array.isArray(value)) {
      return WireType.Set;
    }

    if (value instanceof Map || typeof value === "object") {
      return WireType.Map;
    }
  }

  throw new Error("Unsupported type");
}
