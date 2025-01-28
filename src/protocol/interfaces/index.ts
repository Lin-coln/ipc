export type { SupportedType, WireType, ValueType } from "./constants";
import { SupportedType, WireType, ValueType } from "./constants";

export type WireResolver<T extends SupportedType> = {
  encode(val: T): Buffer;
  decode(buf: Buffer, ofs: number): { value: T; offset: number };
};

export type Encode<T extends SupportedType> = (
  ctx: {
    offset: number;
    wireType: WireType;
    valueType: ValueType;
  },
  val: T,
) => Buffer;
export type Decode<T extends SupportedType> = (
  ctx: {
    offset: number;
    wireType: WireType;
    valueType: ValueType;
  },
  buf: Buffer,
) => T;
