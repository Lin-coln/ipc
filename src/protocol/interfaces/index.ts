export type { SupportedType, WireType } from "../constants";
import { SupportedType, WireType } from "../constants";

export type EncodeContext = {
  readonly wireType: WireType;
  sub<T extends SupportedType>(origin: T, wireType?: WireType): EncodeContext;

  encode(): Buffer;
  encodeType(type: WireType): Buffer;
  encodeContent(): Buffer;
};

export type TypeArrEncodeContext = EncodeContext & {
  getParams(): { type: WireType };
};

export type DecodeContext = {
  offset: number;

  decode<T extends SupportedType>(): T;
  decodeType<Type extends WireType>(): Type;
  decodeContent<T extends SupportedType>(type: WireType): T;
};

export type WireResolver<T extends SupportedType> = {
  encode(ctx: EncodeContext, val: T): Buffer;
  decode(ctx: DecodeContext, buf: Buffer): T;
};
