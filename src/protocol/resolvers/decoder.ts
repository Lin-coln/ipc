import { getWireResolver, SupportedType, WireType } from "../constants";
import { DecodeContext } from "../interfaces";

export class WireDecoder implements DecodeContext {
  buffer: Buffer;
  offset: number;

  constructor(buffer: Buffer, offset: number = 0) {
    this.buffer = buffer;
    this.offset = offset;
  }

  decode<T extends SupportedType>(): T {
    return this.decodeContent(this.decodeType());
  }

  decodeType<Type extends WireType>(): Type {
    return this.buffer[this.offset++] as Type;
  }

  decodeContent<T extends SupportedType>(type: WireType): T {
    const resolver = getWireResolver<T>(type);
    const value = resolver.decode(this, this.buffer);
    return postprocessValue(type, value);
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
