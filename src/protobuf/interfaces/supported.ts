import { WireType } from "./wire_type";

export type SupportedType = SupportedPrimitive | SupportedArr | SupportedMap;
type SupportedPrimitive =
  WireTypeToSupportedPrimitive[keyof WireTypeToSupportedPrimitive];
type SupportedArr = SupportedType[] | Set<SupportedType>;
type SupportedMap =
  | Map<SupportedType, SupportedType>
  | {
      [key: number | string]: SupportedType;
    };

interface WireTypeToSupportedPrimitive extends Record<WireType, any> {
  [WireType.Boolean]: boolean;
  [WireType.VarInt]: number | bigint;
  [WireType.SVarInt]: number | bigint;
  [WireType.VarFloat]: number;
  [WireType.SVarFloat]: number;
  [WireType.String]: string;
  [WireType.Bytes]: Buffer | ArrayBuffer;
}
interface WireTypeToSupportedType extends WireTypeToSupportedPrimitive {
  [WireType.Array]: SupportedArr;
  [WireType.Map]: SupportedMap;
  [WireType.TypeArray]: SupportedArr;
}

export type SupportedTypeOf<Type extends WireType> =
  WireTypeToSupportedType[Type];

export type WireTypeOf<T extends SupportedType> = {
  [K in keyof WireTypeToSupportedType]: T extends WireTypeToSupportedType[K]
    ? K
    : never;
}[keyof WireTypeToSupportedType];
