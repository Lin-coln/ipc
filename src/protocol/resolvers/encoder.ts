import { getWireResolver, SupportedType, WireType } from "../constants";
import { EncodeContext } from "../interfaces";

export class WireEncoder<T extends SupportedType> implements EncodeContext {
  origin: T;
  wireType: WireType;
  #value: T;

  #wireTypeParams: unknown | null = null;

  constructor(origin: T, wireType?: WireType) {
    this.origin = origin;
    this.wireType = wireType ?? parseWireTypeFromSupportedValue(origin);
    this.#value = preprocessValue(this.wireType, this.origin);
  }

  sub<T extends SupportedType>(origin: T, wireType?: WireType): EncodeContext {
    return new WireEncoder(origin, wireType);
  }

  encode(): Buffer {
    return Buffer.concat([
      this.encodeType(this.wireType), // type
      this.encodeContent(), // content
    ]);
  }

  encodeType(type: WireType = this.wireType): Buffer {
    return Buffer.from([type]);
  }

  encodeContent(): Buffer {
    const resolver = getWireResolver<T>(this.wireType);
    return resolver.encode(this, this.#value);
  }

  setWireTypeParams<Params>(params: Params): this {
    this.#wireTypeParams = params ?? null;
    return this;
  }
  getWireTypeParams<Params>(): Params {
    if (this.#wireTypeParams) {
      return this.#wireTypeParams as Params;
    }
    throw new Error(`Failed to get params of ${this.wireType}`);
  }
}

function parseWireTypeFromSupportedValue<T extends SupportedType>(
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
      if ([WireType.Map, WireType.TypeMap].includes(type)) {
        return new Map(Object.entries(value)) as T;
      }
    }
  }

  return value;
}
