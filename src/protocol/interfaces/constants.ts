import type { WireResolver } from "./index";
import {
  boolean,
  svarint,
  varint,
  svarfloat,
  varfloat,
  bytes,
  string,
  set,
  map,
} from "../wireTypes";

export type SupportedType =
  | boolean
  | number
  | bigint
  | string
  // bytes
  | ArrayBuffer
  | Buffer
  // set
  | Set<SupportedType>
  | Array<SupportedType>
  // map
  | Map<SupportedType, SupportedType>
  | JsonObject;
interface JsonObject {
  [key: number | string]: SupportedType;
}

export enum WireType {
  // basic
  Boolean = 0x1, // 0 - false & 1 - true
  VarInt = 0x2, // varint
  SVarInt = 0x3, // varint & zigzag
  VarFloat = 0x4, // [exp:varint, integer:varint]
  SVarFloat = 0x5, // [exp:varint, integer:svarint]
  String = 0x6, // [len:varint, data:utf8]
  Bytes = 0x7, // [len:varint, data:binary]

  // advanced
  Set = 0x8, // [size:varint, values:[type, value]]
  Map = 0x9, // [size:varint, entries:[[type, key], [type, value]]
  // Array = 0b0000, // [size:varint, values:[type, value]]
  // Object = 0b0000, // [size:varint, entries:[key:string, [type, value]]
}

export enum ValueType {
  Boolean = 0x1,
  Number = 0x2,
  BigInt = 0x3,
  String = 0x4,
  Buffer = 0x5,
  Set = 0x6,
  Map = 0x7,
  Array = 0x8,
  Object = 0x9,
}

export function getWireResolver<T extends SupportedType>(
  type: WireType,
): WireResolver<T> {
  const __WireResolvers = {
    [WireType.Boolean]: boolean,
    [WireType.VarInt]: varint,
    [WireType.SVarInt]: svarint,
    [WireType.VarFloat]: varfloat,
    [WireType.SVarFloat]: svarfloat,
    [WireType.Bytes]: bytes,
    [WireType.String]: string,
    [WireType.Set]: set,
    [WireType.Map]: map,
  };
  return __WireResolvers[type] as WireResolver<T>;
}
