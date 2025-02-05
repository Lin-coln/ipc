import { SupportedType, WireType, WireTypeOf } from "../interfaces";

export function parseWireTypeFromSupportedValue<T extends SupportedType>(
  value: T,
): WireTypeOf<T> {
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

  return type as WireTypeOf<T>;
}
