import type { WireResolver } from "../interfaces";
import type { SupportedType } from "./SupportedType";
import { WireType } from "./BasicTypes";
import {
  boolean,
  svarint,
  varint,
  svarfloat,
  varfloat,
  bytes,
  string,
  arr,
  map,
  type_arr,
} from "../wireTypes";

export { WireType } from "./BasicTypes";
export type { SupportedType } from "./SupportedType";
export function getWireResolver<T extends SupportedType>(
  type: WireType,
): WireResolver<T> {
  const __WireResolvers = {
    // basic
    [WireType.Boolean]: boolean,
    [WireType.VarInt]: varint,
    [WireType.SVarInt]: svarint,
    [WireType.VarFloat]: varfloat,
    [WireType.SVarFloat]: svarfloat,
    [WireType.Bytes]: bytes,
    [WireType.String]: string,
    [WireType.Array]: arr,
    [WireType.Map]: map,
    // advanced
    [WireType.TypeArray]: type_arr,
  };
  return __WireResolvers[type] as WireResolver<T>;
}
